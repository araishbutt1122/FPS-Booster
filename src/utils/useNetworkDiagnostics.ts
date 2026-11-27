import { useState, useEffect, useRef, useCallback } from 'react';
import {
  NetworkQualityLevel,
  PingHistoryPoint,
} from '../types.ts';
import { useBooster } from '../context/BoosterContext.tsx';
import { isNativeAndroidRuntime, probeNativeNetworkLatency } from './gamingEngine.ts';
import { measureWarmEndpointRtt } from './networkDiagnostics.ts';

export interface UseNetworkDiagnosticsResult {
  pingMs: number;
  jitterMs: number;
  packetLossPercent: number;
  stabilityPercent: number;
  connectionType: string;
  wifiBand: string | null;
  wifiRssiDbm?: number;
  fastDnsServer: string;
  isRouteLocked: boolean;
  qualityLevel: NetworkQualityLevel;
  qualityLabel: string;
  qualityReason: string;
  shouldSuggestSwitch: boolean;
  switchAdvisory: string | null;
  pingHistory: PingHistoryPoint[];
  wsConnected: boolean;
  isProbingNow: boolean;
  probeNow: () => Promise<void>;
  resetAndOptimizeRoute: () => Promise<void>;
}

function getDefaultWsPingUrl(): string {
  if (typeof window === 'undefined') return 'ws://localhost:3000/ws/ping';
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${window.location.host}/ws/ping`;
}

export function classifyPingQuality(params: {
  isOnline: boolean;
  pingMs: number;
  jitterMs: number;
  packetLossPercent: number;
  stabilityStatus?: string;
}): { level: NetworkQualityLevel; label: string } {
  const { isOnline, pingMs, jitterMs, packetLossPercent, stabilityStatus } = params;

  if (
    !isOnline ||
    stabilityStatus === 'offline' ||
    pingMs <= 0 ||
    pingMs > 100 ||
    packetLossPercent >= 5 ||
    stabilityStatus === 'unstable_wifi' ||
    stabilityStatus === 'unstable_mobile'
  ) {
    return {
      level: 'red',
      label: !isOnline || stabilityStatus === 'offline' ? 'OFFLINE' : 'UNSTABLE >100ms / LOSS',
    };
  }

  if (
    pingMs <= 40 &&
    packetLossPercent === 0 &&
    jitterMs < 15 &&
    stabilityStatus !== 'vpn_overhead'
  ) {
    return {
      level: 'green',
      label: 'OPTIMAL <=40ms',
    };
  }

  return {
    level: 'yellow',
    label: 'ELEVATED 41-100ms',
  };
}

export function useNetworkDiagnostics(): UseNetworkDiagnosticsResult {
  const {
    state,
    masterBoostActive,
    activeRegion,
    networkDiagnostics,
    runPingProbe,
    runFullNetworkDiagnostics,
    optimizeNetworkRoute,
    firewallState,
  } = useBooster();

  const [pingHistory, setPingHistory] = useState<PingHistoryPoint[]>([]);
  const [wsConnected, setWsConnected] = useState(false);
  const [wsPingMs, setWsPingMs] = useState<number | null>(null);
  const [wsJitterMs, setWsJitterMs] = useState<number | null>(null);
  const [wsLossPercent, setWsLossPercent] = useState<number | null>(null);
  const [isProbingNow, setIsProbingNow] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const seqRef = useRef(0);
  const sentRef = useRef(0);
  const recvRef = useRef(0);
  const pendingRef = useRef<Map<number, { sentAt: number; timeoutId: ReturnType<typeof setTimeout> }>>(new Map());
  const recentRttsRef = useRef<number[]>([]);
  const mountedRef = useRef(true);

  const appendHistoryPoint = useCallback(
    (point: Omit<PingHistoryPoint, 'quality'>) => {
      const { level } = classifyPingQuality({
        isOnline: state.isOnline !== false,
        pingMs: point.pingMs,
        jitterMs: point.jitterMs,
        packetLossPercent: point.packetLossPercent,
        stabilityStatus: networkDiagnostics.stabilityStatus,
      });

      const cutoff = Date.now() - 60_000;
      setPingHistory((prev) => [
        ...prev.filter((p) => p.timestamp >= cutoff),
        { ...point, quality: level },
      ].slice(-60));
    },
    [networkDiagnostics.stabilityStatus, state.isOnline]
  );

  const clearPending = useCallback(() => {
    pendingRef.current.forEach((p) => clearTimeout(p.timeoutId));
    pendingRef.current.clear();
  }, []);

  const disconnectWs = useCallback(() => {
    clearPending();
    if (wsRef.current) {
      try {
        wsRef.current.onopen = null;
        wsRef.current.onmessage = null;
        wsRef.current.onerror = null;
        wsRef.current.onclose = null;
        wsRef.current.close();
      } catch {
        // ignore close errors
      }
      wsRef.current = null;
    }
    if (mountedRef.current) {
      setWsConnected(false);
    }
  }, [clearPending]);

  const sendWsPing = useCallback(() => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    if (typeof document !== 'undefined' && document.hidden) return;

    const seq = ++seqRef.current;
    const sentAt = performance.now();
    sentRef.current += 1;

    const timeoutId = setTimeout(() => {
      pendingRef.current.delete(seq);
      if (!mountedRef.current) return;
      const lossPct =
        sentRef.current > 0
          ? Number(
              Math.max(
                0,
                Math.min(100, ((sentRef.current - recvRef.current - pendingRef.current.size) / sentRef.current) * 100)
              ).toFixed(1)
            )
          : 0;
      setWsLossPercent(lossPct);
    }, 2500);

    pendingRef.current.set(seq, { sentAt, timeoutId });

    try {
      ws.send(JSON.stringify({ type: 'ping', seq, clientTs: sentAt }));
    } catch {
      clearTimeout(timeoutId);
      pendingRef.current.delete(seq);
    }
  }, []);

  const connectWs = useCallback(() => {
    disconnectWs();
    if (typeof window === 'undefined' || typeof WebSocket === 'undefined') return;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return;

    try {
      const ws = new WebSocket(getDefaultWsPingUrl());
      wsRef.current = ws;

      ws.onopen = () => {
        if (!mountedRef.current || wsRef.current !== ws) return;
        setWsConnected(true);
        sendWsPing();
      };

      ws.onmessage = (evt) => {
        if (!mountedRef.current || wsRef.current !== ws) return;
        const now = performance.now();
        try {
          const msg = JSON.parse(String(evt.data));
          if (msg.type !== 'pong') return;

          const seq = Number(msg.seq);
          const pending = pendingRef.current.get(seq);
          let rtt: number;
          if (pending) {
            clearTimeout(pending.timeoutId);
            pendingRef.current.delete(seq);
            rtt = Math.max(1, Math.round(now - pending.sentAt));
          } else if (typeof msg.clientTs === 'number') {
            rtt = Math.max(1, Math.round(now - msg.clientTs));
          } else {
            return;
          }

          recvRef.current += 1;
          const samples = [...recentRttsRef.current.slice(-9), rtt];
          recentRttsRef.current = samples;

          let jitter = 0;
          if (samples.length >= 2) {
            let diffs = 0;
            for (let i = 1; i < samples.length; i++) {
              diffs += Math.abs(samples[i] - samples[i - 1]);
            }
            jitter = Number((diffs / (samples.length - 1)).toFixed(1));
          }

          const lossPct =
            sentRef.current > 2
              ? Number(
                  Math.max(
                    0,
                    Math.min(100, ((sentRef.current - recvRef.current - pendingRef.current.size) / sentRef.current) * 100)
                  ).toFixed(1)
                )
              : 0;

          setWsPingMs(rtt);
          setWsJitterMs(jitter);
          setWsLossPercent(lossPct);

          appendHistoryPoint({
            timestamp: Date.now(),
            pingMs: rtt,
            jitterMs: jitter,
            packetLossPercent: lossPct,
            source: 'websocket',
          });
        } catch {
          // ignore malformed payload
        }
      };

      ws.onerror = () => {
        if (!mountedRef.current || wsRef.current !== ws) return;
        setWsConnected(false);
      };

      ws.onclose = () => {
        if (!mountedRef.current || wsRef.current !== ws) return;
        clearPending();
        setWsConnected(false);
      };
    } catch {
      setWsConnected(false);
    }
  }, [appendHistoryPoint, clearPending, disconnectWs, sendWsPing]);

  useEffect(() => {
    mountedRef.current = true;
    connectWs();
    return () => {
      mountedRef.current = false;
      disconnectWs();
    };
  }, [connectWs, disconnectWs]);

  // 2s cadence during active Boost or Dashboard view; throttled in Battery Saver
  useEffect(() => {
    const cadenceMs = state.batterySaverMode ? 8000 : masterBoostActive ? 2000 : 3000;
    const iv = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        sendWsPing();
      } else if (activeRegion.currentPingMs > 0 || networkDiagnostics.pingMs > 0) {
        appendHistoryPoint({
          timestamp: Date.now(),
          pingMs: activeRegion.currentPingMs > 0 ? activeRegion.currentPingMs : networkDiagnostics.pingMs,
          jitterMs: networkDiagnostics.jitterMs,
          packetLossPercent: networkDiagnostics.packetLossPercent,
          source: isNativeAndroidRuntime() ? 'native' : 'http',
        });
      }
    }, cadenceMs);

    return () => clearInterval(iv);
  }, [
    activeRegion.currentPingMs,
    appendHistoryPoint,
    masterBoostActive,
    networkDiagnostics.jitterMs,
    networkDiagnostics.packetLossPercent,
    networkDiagnostics.pingMs,
    sendWsPing,
    state.batterySaverMode,
  ]);

  const probeNow = useCallback(async () => {
    setIsProbingNow(true);
    try {
      if (isNativeAndroidRuntime() && activeRegion.host) {
        const res = await probeNativeNetworkLatency([activeRegion.host, '1.1.1.1']);
        if (res && res.bestPingMs > 0) {
          appendHistoryPoint({
            timestamp: Date.now(),
            pingMs: res.bestPingMs,
            jitterMs: res.bestJitterMs,
            packetLossPercent: res.bestLossPercent,
            source: 'native',
          });
        }
      } else {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          sendWsPing();
        }
        const warm = await measureWarmEndpointRtt(activeRegion.url, 1400);
        if (warm.reachable) {
          appendHistoryPoint({
            timestamp: Date.now(),
            pingMs: warm.pingMs,
            jitterMs: warm.jitterMs,
            packetLossPercent: warm.packetLossPercent,
            source: 'http',
          });
        }
      }
      await Promise.all([runPingProbe(true), runFullNetworkDiagnostics()]);
    } finally {
      if (mountedRef.current) setIsProbingNow(false);
    }
  }, [
    activeRegion.host,
    activeRegion.url,
    appendHistoryPoint,
    runFullNetworkDiagnostics,
    runPingProbe,
    sendWsPing,
  ]);

  const resetAndOptimizeRoute = useCallback(async () => {
    setIsProbingNow(true);
    try {
      sentRef.current = 0;
      recvRef.current = 0;
      recentRttsRef.current = [];
      connectWs();
      await optimizeNetworkRoute('Manual Route Reset');
      await runFullNetworkDiagnostics();
    } finally {
      if (mountedRef.current) setIsProbingNow(false);
    }
  }, [connectWs, optimizeNetworkRoute, runFullNetworkDiagnostics]);

  const effectivePing =
    state.isOnline === false
      ? 0
      : activeRegion.currentPingMs > 0
      ? activeRegion.currentPingMs
      : wsPingMs ?? networkDiagnostics.pingMs;

  const effectiveJitter =
    networkDiagnostics.jitterMs > 0
      ? networkDiagnostics.jitterMs
      : wsJitterMs ?? 0;

  const effectiveLoss = Math.max(
    networkDiagnostics.packetLossPercent || 0,
    wsLossPercent || 0
  );

  const quality = classifyPingQuality({
    isOnline: state.isOnline !== false,
    pingMs: effectivePing,
    jitterMs: effectiveJitter,
    packetLossPercent: effectiveLoss,
    stabilityStatus: networkDiagnostics.stabilityStatus,
  });

  const connType = (networkDiagnostics.connectionType || 'WEB').toUpperCase();
  const isWifi = connType.includes('WIFI');
  const isCellular =
    connType.includes('CELLULAR') ||
    connType.includes('4G') ||
    connType.includes('5G') ||
    connType.includes('3G');

  const shouldSuggestSwitch =
    state.isOnline === false ||
    quality.level === 'red' ||
    networkDiagnostics.stabilityStatus === 'unstable_wifi' ||
    networkDiagnostics.stabilityStatus === 'unstable_mobile' ||
    networkDiagnostics.stabilityStatus === 'vpn_overhead';

  let switchAdvisory: string | null = null;
  if (state.isOnline === false) {
    switchAdvisory = 'Network disconnected — enable Wi-Fi or 4G/5G Mobile Data.';
  } else if (networkDiagnostics.stabilityStatus === 'vpn_overhead') {
    switchAdvisory = 'External VPN tunnel detected — disconnect third-party VPN to cut hop ping.';
  } else if (networkDiagnostics.stabilityStatus === 'unstable_wifi' || (isWifi && quality.level === 'red')) {
    switchAdvisory = 'Wi-Fi signal unstable or dropping packets — switch to 5GHz Wi-Fi or 4G/5G Mobile Data.';
  } else if (networkDiagnostics.stabilityStatus === 'unstable_mobile' || (isCellular && quality.level === 'red')) {
    switchAdvisory = 'Mobile data latency spiking — move to stronger signal or switch to stable Wi-Fi.';
  } else if (quality.level === 'red') {
    switchAdvisory = 'High latency or packet loss detected — tap Reset Route or switch Wi-Fi ↔ Cellular.';
  }

  return {
    pingMs: effectivePing,
    jitterMs: effectiveJitter,
    packetLossPercent: effectiveLoss,
    stabilityPercent: networkDiagnostics.stabilityPercent,
    connectionType: networkDiagnostics.connectionType,
    wifiBand: networkDiagnostics.wifiBand ?? null,
    wifiRssiDbm: networkDiagnostics.wifiRssiDbm,
    fastDnsServer: networkDiagnostics.fastDnsServer || (firewallState.dnsFilterEnabled ? '1.1.1.1 / 1.0.0.1' : 'ISP Default'),
    isRouteLocked: Boolean(networkDiagnostics.isRouteLocked ?? masterBoostActive),
    qualityLevel: quality.level,
    qualityLabel: quality.label,
    qualityReason: networkDiagnostics.stabilityReason || 'Monitoring real-time round-trip latency',
    shouldSuggestSwitch,
    switchAdvisory,
    pingHistory,
    wsConnected,
    isProbingNow,
    probeNow,
    resetAndOptimizeRoute,
  };
}
