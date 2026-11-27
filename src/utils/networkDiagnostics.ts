import {
  ConnectionStabilityStatus,
  NetworkDiagnosticsState,
} from '../types.ts';
import {
  GamingEngineNative,
  isNativeAndroidRuntime,
  probeNativeNetworkLatency,
} from './gamingEngine.ts';

interface NetworkInformationLike {
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  type?: string;
}

export interface EndpointRttSampleResult {
  pingMs: number;
  jitterMs: number;
  packetLossPercent: number;
  reachable: boolean;
  samples: number[];
}

/**
 * Measures genuine 1-RTT network latency using a 1-request keepalive warmup
 * (eliminating false DNS + TLS 1.3 cold-handshake inflation) followed by 3 rapid probes.
 * Never fabricates or scales down real latency; unreachable probes report reachable=false.
 */
export async function measureWarmEndpointRtt(
  probeUrl: string,
  timeoutMs: number = 1500
): Promise<EndpointRttSampleResult> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return {
      pingMs: 0,
      jitterMs: 0,
      packetLossPercent: 100,
      reachable: false,
      samples: [],
    };
  }

  let warmupMs: number | null = null;
  try {
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), timeoutMs);
    const t0 = performance.now();
    await fetch(probeUrl, {
      method: 'HEAD',
      mode: 'no-cors',
      cache: 'no-store',
      keepalive: true,
      signal: ctrl.signal,
    });
    clearTimeout(tid);
    warmupMs = Math.max(1, Math.round(performance.now() - t0));
  } catch {
    // Cold warmup failed; still attempt direct probes before declaring loss
  }

  const samples: number[] = [];
  let failures = 0;

  for (let i = 0; i < 3; i++) {
    const start = performance.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      await fetch(probeUrl, {
        method: 'HEAD',
        mode: 'no-cors',
        cache: 'no-store',
        keepalive: true,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const rtt = Math.max(1, Math.round(performance.now() - start));
      samples.push(rtt);
    } catch {
      failures++;
    }
  }

  if (samples.length === 0 && warmupMs !== null) {
    return {
      pingMs: warmupMs,
      jitterMs: 0,
      packetLossPercent: 75,
      reachable: true,
      samples: [warmupMs],
    };
  }

  if (samples.length === 0) {
    return {
      pingMs: 0,
      jitterMs: 0,
      packetLossPercent: 100,
      reachable: false,
      samples: [],
    };
  }

  const sorted = [...samples].sort((a, b) => a - b);
  const medianPing =
    sorted.length === 3
      ? sorted[1]
      : Math.round(sorted.reduce((sum, v) => sum + v, 0) / sorted.length);

  let jitterMs = 0;
  if (samples.length >= 2) {
    let diffs = 0;
    for (let i = 1; i < samples.length; i++) {
      diffs += Math.abs(samples[i] - samples[i - 1]);
    }
    jitterMs = Number((diffs / (samples.length - 1)).toFixed(1));
  }

  const packetLossPercent = Number(((failures / 3) * 100).toFixed(1));

  return {
    pingMs: medianPing,
    jitterMs,
    packetLossPercent,
    reachable: true,
    samples,
  };
}

export function classifyConnectionStability(params: {
  isOnline: boolean;
  pingMs: number;
  jitterMs: number;
  packetLossPercent: number;
  connectionType: string;
  vpnOverheadDetected: boolean;
  localFirewallBypassActive: boolean;
  wifiRssiDbm?: number;
  wifiLinkMbps?: number;
  wifiBand?: '5GHz' | '2.4GHz' | '6GHz' | null;
  validated?: boolean;
}): {
  stabilityPercent: number;
  stabilityStatus: ConnectionStabilityStatus;
  stabilityReason: string;
  routingMode: NetworkDiagnosticsState['routingMode'];
  targetAchievable20to40: boolean;
} {
  const {
    isOnline,
    pingMs,
    jitterMs,
    packetLossPercent,
    connectionType,
    vpnOverheadDetected,
    localFirewallBypassActive,
    wifiRssiDbm,
    wifiLinkMbps,
    wifiBand,
    validated = true,
  } = params;

  const routingMode: NetworkDiagnosticsState['routingMode'] = vpnOverheadDetected
    ? 'EXTERNAL_VPN_HOP'
    : localFirewallBypassActive
    ? 'GAME_EXCLUDED_BYPASS'
    : 'DIRECT_PHYSICAL';

  if (!isOnline || !validated || packetLossPercent >= 95 || pingMs <= 0) {
    return {
      stabilityPercent: 0,
      stabilityStatus: 'offline',
      stabilityReason: 'No validated internet route detected',
      routingMode,
      targetAchievable20to40: false,
    };
  }

  const jitterPenalty = Math.min(35, jitterMs * 1.45);
  const lossPenalty = packetLossPercent * 1.4;
  const rssiPenalty =
    connectionType === 'WIFI' && typeof wifiRssiDbm === 'number' && wifiRssiDbm < 0 && wifiRssiDbm < -74
      ? Math.min(20, (-74 - wifiRssiDbm) * 1.2)
      : 0;
  const pingPenalty = pingMs > 140 ? 18 : pingMs > 85 ? 10 : pingMs > 45 ? 4 : 0;
  const vpnPenalty = vpnOverheadDetected ? 12 : 0;

  const stabilityPercent = Math.max(
    10,
    Math.min(100, Math.round(100 - jitterPenalty - lossPenalty - rssiPenalty - pingPenalty - vpnPenalty))
  );

  const targetAchievable20to40 = pingMs >= 1 && pingMs <= 40;

  if (vpnOverheadDetected) {
    return {
      stabilityPercent,
      stabilityStatus: 'vpn_overhead',
      stabilityReason: `External VPN hop detected (+latency) · Actual ${pingMs}ms`,
      routingMode,
      targetAchievable20to40,
    };
  }

  const isWeakWifi =
    connectionType === 'WIFI' &&
    ((typeof wifiRssiDbm === 'number' && wifiRssiDbm < 0 && wifiRssiDbm < -73) ||
      (typeof wifiLinkMbps === 'number' && wifiLinkMbps > 0 && wifiLinkMbps < 24) ||
      jitterMs >= 18 ||
      packetLossPercent > 0);

  if (isWeakWifi) {
    const rssiTag = wifiRssiDbm && wifiRssiDbm < 0 ? ` (${wifiRssiDbm} dBm)` : '';
    return {
      stabilityPercent,
      stabilityStatus: 'unstable_wifi',
      stabilityReason: `Unstable Wi-Fi${rssiTag}: ${jitterMs}ms jitter, ${packetLossPercent}% loss`,
      routingMode,
      targetAchievable20to40,
    };
  }

  const isMobileConn =
    connectionType === 'CELLULAR' ||
    connectionType === '4G' ||
    connectionType === '3G' ||
    connectionType === '2G' ||
    connectionType === 'SLOW-2G';

  if (isMobileConn && (jitterMs >= 16 || packetLossPercent > 0 || connectionType === '3G' || connectionType === '2G')) {
    return {
      stabilityPercent,
      stabilityStatus: 'unstable_mobile',
      stabilityReason: `Unstable ${connectionType} signal: ${jitterMs}ms jitter, ${packetLossPercent}% loss`,
      routingMode,
      targetAchievable20to40,
    };
  }

  if (pingMs > 40) {
    return {
      stabilityPercent,
      stabilityStatus: pingMs <= 75 && jitterMs <= 12 ? 'good' : 'high_latency',
      stabilityReason: `Actual ${pingMs}ms (20–40ms unreachable on current ISP/route)`,
      routingMode,
      targetAchievable20to40: false,
    };
  }

  const bandTag = wifiBand ? ` ${wifiBand}` : '';
  return {
    stabilityPercent,
    stabilityStatus: 'optimal',
    stabilityReason: `20–40ms target achieved on direct ${connectionType}${bandTag} route`,
    routingMode,
    targetAchievable20to40: true,
  };
}

export async function runNetworkSpeedDiagnostics(
  probeUrl: string,
  fallbackPingMs: number,
  options?: {
    nativeHost?: string;
    localFirewallBypassActive?: boolean;
    prevAutoOptimizeEnabled?: boolean;
    prevLastOptimizedAt?: number | null;
    prevLastOptimizationAction?: string | null;
  }
): Promise<NetworkDiagnosticsState> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return {
      pingMs: 0,
      jitterMs: 0,
      packetLossPercent: 100,
      downloadMbps: 0,
      uploadMbps: 0,
      stabilityPercent: 0,
      connectionType: 'OFFLINE',
      isMeasuringSpeed: false,
      lastDiagnosticsAt: Date.now(),
      stabilityStatus: 'offline',
      stabilityReason: 'Device offline',
      vpnOverheadDetected: false,
      routingMode: 'DIRECT_PHYSICAL',
      targetAchievable20to40: false,
      wifiBand: null,
      autoOptimizeEnabled: options?.prevAutoOptimizeEnabled ?? true,
      lastOptimizedAt: options?.prevLastOptimizedAt ?? null,
      lastOptimizationAction: options?.prevLastOptimizationAction ?? null,
    };
  }

  // 1. Genuine RTT + Jitter + Packet Loss measurement
  let measuredPing = fallbackPingMs;
  let jitterMs = 0;
  let packetLossPercent = 0;
  let externalVpnFromProbe = false;

  if (isNativeAndroidRuntime() && options?.nativeHost) {
    const nativeProbe = await probeNativeNetworkLatency([options.nativeHost, '1.1.1.1', '8.8.8.8']);
    if (nativeProbe) {
      externalVpnFromProbe = Boolean(nativeProbe.externalVpnDetected);
      const targetMatch = nativeProbe.results.find((r) => r.host === options.nativeHost);
      if (targetMatch && targetMatch.reachable) {
        measuredPing = targetMatch.pingMs;
        jitterMs = targetMatch.jitterMs;
        packetLossPercent = targetMatch.packetLossPercent;
      } else if (nativeProbe.bestPingMs > 0) {
        measuredPing = nativeProbe.bestPingMs;
        jitterMs = nativeProbe.bestJitterMs;
        packetLossPercent = nativeProbe.bestLossPercent;
      }
    }
  } else {
    const warm = await measureWarmEndpointRtt(probeUrl);
    if (warm.reachable) {
      measuredPing = warm.pingMs;
      jitterMs = warm.jitterMs;
      packetLossPercent = warm.packetLossPercent;
    } else {
      measuredPing = fallbackPingMs > 0 ? fallbackPingMs : 0;
      packetLossPercent = 100;
    }
  }

  // 2. Genuine Native Android ConnectivityManager + WifiManager + Browser NetworkInformation
  let downloadMbps = 0;
  let uploadMbps = 0;
  let connectionType = 'WEB';
  let vpnOverheadDetected = externalVpnFromProbe;
  let validated = true;
  let wifiRssiDbm: number | undefined;
  let wifiLinkMbps: number | undefined;
  let wifiBand: '5GHz' | '2.4GHz' | '6GHz' | null = null;

  const navConn = (navigator as unknown as { connection?: NetworkInformationLike }).connection;
  if (navConn?.type) {
    connectionType = navConn.type.toUpperCase();
  } else if (navConn?.effectiveType) {
    connectionType = navConn.effectiveType.toUpperCase();
  }

  if (isNativeAndroidRuntime()) {
    try {
      const netStats = await GamingEngineNative.getNetworkStats();
      connectionType = netStats.transport || connectionType;
      validated = netStats.validated ?? netStats.connected;
      if (netStats.vpnActiveOnDevice) {
        vpnOverheadDetected = true;
      }
      if (netStats.downstreamKbps > 0) {
        downloadMbps = Number((netStats.downstreamKbps / 1000).toFixed(1));
      }
      if (netStats.upstreamKbps > 0) {
        uploadMbps = Number((netStats.upstreamKbps / 1000).toFixed(1));
      }
      if (typeof netStats.wifiRssi === 'number' && netStats.wifiRssi < 0) {
        wifiRssiDbm = netStats.wifiRssi;
      }
      if (typeof netStats.wifiLinkMbps === 'number' && netStats.wifiLinkMbps > 0) {
        wifiLinkMbps = netStats.wifiLinkMbps;
      }
      if (typeof netStats.wifiFreqMhz === 'number' && netStats.wifiFreqMhz > 0) {
        wifiBand =
          netStats.wifiFreqMhz >= 5900
            ? '6GHz'
            : netStats.wifiFreqMhz >= 4900
            ? '5GHz'
            : '2.4GHz';
      }
    } catch {
      // Fall back cleanly to NetworkInformation API
    }
  }

  if (downloadMbps <= 0 && navConn?.downlink && navConn.downlink > 0) {
    downloadMbps = Number(navConn.downlink.toFixed(1));
  }

  if (uploadMbps <= 0 && downloadMbps > 0) {
    uploadMbps = Number(Math.max(0.5, downloadMbps * 0.42).toFixed(1));
  }

  const stability = classifyConnectionStability({
    isOnline: true,
    pingMs: measuredPing,
    jitterMs,
    packetLossPercent,
    connectionType,
    vpnOverheadDetected,
    localFirewallBypassActive: Boolean(options?.localFirewallBypassActive),
    wifiRssiDbm,
    wifiLinkMbps,
    wifiBand,
    validated,
  });

  return {
    pingMs: measuredPing,
    jitterMs,
    packetLossPercent,
    downloadMbps,
    uploadMbps,
    stabilityPercent: stability.stabilityPercent,
    connectionType,
    isMeasuringSpeed: false,
    lastDiagnosticsAt: Date.now(),
    stabilityStatus: stability.stabilityStatus,
    stabilityReason: stability.stabilityReason,
    vpnOverheadDetected,
    routingMode: stability.routingMode,
    targetAchievable20to40: stability.targetAchievable20to40,
    wifiRssiDbm,
    wifiLinkMbps,
    wifiBand,
    autoOptimizeEnabled: options?.prevAutoOptimizeEnabled ?? true,
    lastOptimizedAt: options?.prevLastOptimizedAt ?? null,
    lastOptimizationAction: options?.prevLastOptimizationAction ?? null,
  };
}
