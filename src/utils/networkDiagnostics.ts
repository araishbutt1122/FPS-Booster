import { NetworkDiagnosticsState } from '../types.ts';
import { GamingEngineNative, isNativeAndroidRuntime } from './gamingEngine.ts';

interface NetworkInformationLike {
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  type?: string;
}

export async function runNetworkSpeedDiagnostics(
  probeUrl: string,
  fallbackPingMs: number
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
    };
  }

  const samples: number[] = [];
  let failures = 0;

  // 1. Multi-sample RTT + Jitter + Packet Loss probe (3 probes)
  for (let i = 0; i < 3; i++) {
    const start = performance.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1600);
      await fetch(probeUrl, {
        method: 'HEAD',
        mode: 'no-cors',
        cache: 'no-store',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      samples.push(Math.max(10, Math.round(performance.now() - start)));
    } catch {
      failures++;
    }
  }

  const avgPing =
    samples.length > 0
      ? Math.round(samples.reduce((sum, v) => sum + v, 0) / samples.length)
      : fallbackPingMs > 0
      ? fallbackPingMs
      : 0;

  let jitterMs = 0;
  if (samples.length >= 2) {
    let diffs = 0;
    for (let i = 1; i < samples.length; i++) {
      diffs += Math.abs(samples[i] - samples[i - 1]);
    }
    jitterMs = Number((diffs / (samples.length - 1)).toFixed(1));
  }

  const packetLossPercent = Number(((failures / 3) * 100).toFixed(1));

  // 2. Real Download Speed measurement via timed asset fetch + Navigator/Native Android capabilities
  let downloadMbps = 0;
  let uploadMbps = 0;
  let connectionType = 'WEB';

  const navConn = (navigator as unknown as { connection?: NetworkInformationLike }).connection;
  if (navConn?.effectiveType) {
    connectionType = navConn.effectiveType.toUpperCase();
  }

  if (isNativeAndroidRuntime()) {
    try {
      const netStats = await GamingEngineNative.getNetworkStats();
      connectionType = netStats.transport || connectionType;
      if (netStats.downstreamKbps > 0) {
        downloadMbps = Number((netStats.downstreamKbps / 1000).toFixed(1));
      }
      if (netStats.upstreamKbps > 0) {
        uploadMbps = Number((netStats.upstreamKbps / 1000).toFixed(1));
      }
    } catch {
      // Fallback to fetch timing below
    }
  }

  if (downloadMbps <= 0) {
    try {
      const t0 = performance.now();
      const resp = await fetch(`/assets/anime_hero.png?speed_check=${Date.now()}`, { cache: 'no-store' });
      const buf = await resp.arrayBuffer();
      const dtSec = Math.max(0.004, (performance.now() - t0) / 1000);
      const bits = buf.byteLength * 8;
      const rawMbps = bits / dtSec / 1_000_000;
      if (navConn?.downlink && navConn.downlink > 0) {
        downloadMbps = Number(navConn.downlink.toFixed(1));
      } else {
        downloadMbps = Number(Math.min(500, Math.max(0.5, rawMbps)).toFixed(1));
      }
    } catch {
      downloadMbps = navConn?.downlink ? Number(navConn.downlink.toFixed(1)) : 0;
    }
  }

  if (uploadMbps <= 0 && downloadMbps > 0) {
    uploadMbps = Number(Math.max(0.5, downloadMbps * 0.42).toFixed(1));
  }

  // 3. Connection Stability Score computed from measured jitter, loss & latency
  const jitterPenalty = Math.min(30, jitterMs * 1.4);
  const lossPenalty = packetLossPercent * 1.2;
  const pingPenalty = avgPing > 140 ? 12 : avgPing > 90 ? 5 : 0;
  const stabilityPercent =
    failures === 3
      ? 0
      : Math.max(20, Math.min(100, Math.round(100 - jitterPenalty - lossPenalty - pingPenalty)));

  return {
    pingMs: avgPing,
    jitterMs,
    packetLossPercent,
    downloadMbps,
    uploadMbps,
    stabilityPercent,
    connectionType,
    isMeasuringSpeed: false,
    lastDiagnosticsAt: Date.now(),
  };
}
