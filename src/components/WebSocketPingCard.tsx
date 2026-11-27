import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Radio,
  Wifi,
  WifiOff,
  Play,
  Square,
  RefreshCw,
  Settings2,
  Check,
} from 'lucide-react';
import { useBooster } from '../context/BoosterContext.tsx';
import { sound } from '../utils/audio.ts';
import { haptics } from '../utils/haptics.ts';

type WsStatus = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'ERROR';

function getDefaultWsUrl(): string {
  if (typeof window === 'undefined') return 'ws://localhost:3000/ws/ping';
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${window.location.host}/ws/ping`;
}

export const WebSocketPingCard: React.FC = () => {
  const { state } = useBooster();

  const [wsUrl, setWsUrl] = useState<string>(getDefaultWsUrl);
  const [draftUrl, setDraftUrl] = useState<string>(getDefaultWsUrl);
  const [isEditingUrl, setIsEditingUrl] = useState<boolean>(false);

  const [wsStatus, setWsStatus] = useState<WsStatus>('DISCONNECTED');
  const [serverName, setServerName] = useState<string>('Local Gaming Server');
  const [latestRttMs, setLatestRttMs] = useState<number | null>(null);
  const [jitterMs, setJitterMs] = useState<number>(0);
  const [sentCount, setSentCount] = useState<number>(0);
  const [recvCount, setRecvCount] = useState<number>(0);
  const [historyMs, setHistoryMs] = useState<number[]>([]);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const [autoEnabled, setAutoEnabled] = useState<boolean>(true);

  const wsRef = useRef<WebSocket | null>(null);
  const seqRef = useRef<number>(0);
  const pendingRef = useRef<Map<number, { sentAt: number; timeoutId: ReturnType<typeof setTimeout> }>>(new Map());
  const prevRttRef = useRef<number | null>(null);
  const mountedRef = useRef<boolean>(true);

  const clearPendingPings = useCallback(() => {
    pendingRef.current.forEach((entry) => clearTimeout(entry.timeoutId));
    pendingRef.current.clear();
  }, []);

  const disconnectSocket = useCallback(() => {
    clearPendingPings();
    if (wsRef.current) {
      try {
        wsRef.current.onopen = null;
        wsRef.current.onmessage = null;
        wsRef.current.onerror = null;
        wsRef.current.onclose = null;
        wsRef.current.close();
      } catch {
        // Ignore close errors
      }
      wsRef.current = null;
    }
    if (mountedRef.current) {
      setWsStatus('DISCONNECTED');
    }
  }, [clearPendingPings]);

  const sendPingPacket = useCallback(() => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    if (typeof document !== 'undefined' && document.hidden) return;

    const seq = ++seqRef.current;
    const clientTs = performance.now();

    const timeoutId = setTimeout(() => {
      pendingRef.current.delete(seq);
    }, 3500);

    pendingRef.current.set(seq, { sentAt: clientTs, timeoutId });
    if (mountedRef.current) {
      setSentCount((c) => c + 1);
    }

    try {
      ws.send(
        JSON.stringify({
          type: 'ping',
          seq,
          clientTs,
        })
      );
    } catch {
      clearTimeout(timeoutId);
      pendingRef.current.delete(seq);
    }
  }, []);

  const connectSocket = useCallback(
    (targetUrl: string) => {
      disconnectSocket();
      if (!targetUrl.startsWith('ws://') && !targetUrl.startsWith('wss://')) {
        setWsStatus('ERROR');
        setErrorDetail('URL must start with ws:// or wss://');
        return;
      }

      setWsStatus('CONNECTING');
      setErrorDetail(null);

      try {
        const ws = new WebSocket(targetUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          if (!mountedRef.current || wsRef.current !== ws) return;
          setWsStatus('CONNECTED');
          setErrorDetail(null);
          sendPingPacket();
        };

        ws.onmessage = (evt) => {
          if (!mountedRef.current || wsRef.current !== ws) return;
          const now = performance.now();
          try {
            const msg = JSON.parse(String(evt.data));
            if (msg.type === 'welcome') {
              if (msg.serverName) setServerName(String(msg.serverName));
              return;
            }
            if (msg.type === 'pong') {
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
                rtt = 1;
              }

              if (msg.serverName) setServerName(String(msg.serverName));

              const prevRtt = prevRttRef.current;
              prevRttRef.current = rtt;
              if (prevRtt !== null) {
                setJitterMs(Number(Math.abs(rtt - prevRtt).toFixed(1)));
              }

              setLatestRttMs(rtt);
              setRecvCount((c) => c + 1);
              setHistoryMs((prev) => [...prev.slice(-11), rtt]);
            }
          } catch {
            // Ignore malformed socket frames
          }
        };

        ws.onerror = () => {
          if (!mountedRef.current || wsRef.current !== ws) return;
          setWsStatus('ERROR');
          setErrorDetail('WebSocket server unreachable');
        };

        ws.onclose = () => {
          if (!mountedRef.current || wsRef.current !== ws) return;
          clearPendingPings();
          setWsStatus((prev) => (prev === 'ERROR' ? 'ERROR' : 'DISCONNECTED'));
        };
      } catch (err) {
        setWsStatus('ERROR');
        setErrorDetail(err instanceof Error ? err.message : 'Unable to open WebSocket');
      }
    },
    [clearPendingPings, disconnectSocket, sendPingPacket]
  );

  useEffect(() => {
    mountedRef.current = true;
    if (autoEnabled) {
      connectSocket(wsUrl);
    }
    return () => {
      mountedRef.current = false;
      disconnectSocket();
    };
  }, [wsUrl, autoEnabled, connectSocket, disconnectSocket]);

  // Periodic WebSocket ping interval (throttled when Battery Saver mode is ON)
  useEffect(() => {
    if (!autoEnabled || wsStatus !== 'CONNECTED') return;
    const cadenceMs = state.batterySaverMode ? 10000 : 2500;
    const iv = setInterval(() => {
      sendPingPacket();
    }, cadenceMs);
    return () => clearInterval(iv);
  }, [autoEnabled, wsStatus, state.batterySaverMode, sendPingPacket]);

  const packetLossPct =
    sentCount > 2
      ? Math.max(
          0,
          Math.min(100, Math.round(((sentCount - recvCount - pendingRef.current.size) / sentCount) * 100))
        )
      : 0;

  const rttQuality =
    latestRttMs === null
      ? { label: '--', color: 'text-slate-400' }
      : latestRttMs < 40
      ? { label: 'EXCELLENT', color: 'text-emerald-400' }
      : latestRttMs < 80
      ? { label: 'GOOD', color: 'text-cyan-300' }
      : latestRttMs <= 160
      ? { label: 'MODERATE', color: 'text-amber-300' }
      : { label: 'HIGH', color: 'text-red-400' };

  const statusBadge =
    wsStatus === 'CONNECTED'
      ? 'bg-emerald-950 text-emerald-300 border-emerald-500/60'
      : wsStatus === 'CONNECTING'
      ? 'bg-amber-950 text-amber-300 border-amber-500/60'
      : wsStatus === 'ERROR'
      ? 'bg-red-950 text-red-300 border-red-500/60'
      : 'bg-slate-800 text-slate-300 border-slate-600';

  return (
    <div className="p-3.5 rounded-2xl bg-[#06122c]/95 border border-cyan-500/50 shadow-xl space-y-3">
      {/* Card Header */}
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-cyan-950/90">
        <div className="flex items-center space-x-2 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-400/50 flex items-center justify-center text-cyan-300 shrink-0">
            {wsStatus === 'CONNECTED' ? (
              <Wifi className="w-4 h-4 text-emerald-400" />
            ) : (
              <WifiOff className="w-4 h-4 text-slate-400" />
            )}
          </div>
          <div className="min-w-0">
            <h4 className="font-orbitron font-bold text-xs text-white uppercase tracking-wide flex items-center space-x-1.5">
              <span>Live WebSocket Ping</span>
              <Radio
                className={`w-3 h-3 shrink-0 ${
                  wsStatus === 'CONNECTED' ? 'text-emerald-400 animate-pulse' : 'text-slate-500'
                }`}
              />
            </h4>
            <p className="text-[10px] font-mono text-cyan-300/80 truncate">
              {serverName} · {state.batterySaverMode ? '10s Battery Saver' : '2.5s Live'}
            </p>
          </div>
        </div>

        <span
          className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border whitespace-nowrap shrink-0 ${statusBadge}`}
        >
          {wsStatus}
        </span>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-3 gap-2 text-center font-mono">
        <div className="bg-[#030b1d] border border-cyan-950 rounded-xl p-2">
          <span className="text-[9px] text-slate-400 block">WS RTT</span>
          <span className="font-orbitron font-extrabold text-base text-cyan-300 tabular-nums block">
            {latestRttMs !== null ? `${latestRttMs}ms` : '--'}
          </span>
          <span className={`text-[9px] font-bold ${rttQuality.color}`}>{rttQuality.label}</span>
        </div>

        <div className="bg-[#030b1d] border border-cyan-950 rounded-xl p-2">
          <span className="text-[9px] text-slate-400 block">JITTER</span>
          <span className="font-orbitron font-extrabold text-base text-amber-300 tabular-nums block">
            ±{jitterMs}ms
          </span>
          <span className="text-[9px] text-slate-400">Delta</span>
        </div>

        <div className="bg-[#030b1d] border border-cyan-950 rounded-xl p-2">
          <span className="text-[9px] text-slate-400 block">PACKET LOSS</span>
          <span
            className={`font-orbitron font-extrabold text-base tabular-nums block ${
              packetLossPct > 0 ? 'text-red-400' : 'text-emerald-400'
            }`}
          >
            {packetLossPct}%
          </span>
          <span className="text-[9px] text-slate-400 tabular-nums">
            {recvCount}/{sentCount}
          </span>
        </div>
      </div>

      {/* Mini RTT Bar Sparkline */}
      <div className="bg-[#030b1d] border border-cyan-950/90 rounded-xl p-2 flex items-end justify-between gap-1 h-12">
        {historyMs.length === 0 ? (
          <span className="text-[10px] font-mono text-slate-500 m-auto">
            {errorDetail || 'Waiting for WebSocket pong telemetry...'}
          </span>
        ) : (
          historyMs.map((val, idx) => {
            const pct = Math.min(100, Math.max(15, Math.round((val / 150) * 100)));
            const barColor =
              val < 40 ? 'bg-emerald-400' : val < 90 ? 'bg-cyan-400' : 'bg-amber-400';
            return (
              <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full">
                <div
                  className={`w-full rounded-t ${barColor} transition-all duration-200`}
                  style={{ height: `${pct}%` }}
                  title={`${val} ms`}
                />
              </div>
            );
          })
        )}
      </div>

      {/* Editable Endpoint Input */}
      {isEditingUrl && (
        <div className="flex items-center gap-1.5">
          <input
            type="text"
            value={draftUrl}
            onChange={(e) => setDraftUrl(e.target.value)}
            aria-label="WebSocket Gaming Server URL"
            placeholder="ws://localhost:3000/ws/ping"
            className="flex-1 bg-[#030b1d] border border-cyan-700/70 rounded-xl px-2.5 py-1.5 text-[11px] font-mono text-white focus:outline-none focus:border-cyan-400"
          />
          <button
            type="button"
            onClick={() => {
              haptics.impactLight();
              sound.playClick();
              setWsUrl(draftUrl.trim() || getDefaultWsUrl());
              setIsEditingUrl(false);
              setAutoEnabled(true);
            }}
            className="px-2.5 py-1.5 rounded-xl bg-cyan-500 text-black font-mono font-bold text-[10px] flex items-center space-x-1 cursor-pointer"
          >
            <Check className="w-3 h-3" />
            <span>Save</span>
          </button>
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => {
            haptics.impactLight();
            sound.playClick();
            const next = !autoEnabled;
            setAutoEnabled(next);
            if (!next) {
              disconnectSocket();
            } else {
              connectSocket(wsUrl);
            }
          }}
          className={`flex-1 py-1.5 px-2.5 rounded-xl border text-[10px] font-mono font-bold flex items-center justify-center space-x-1 cursor-pointer ${
            autoEnabled
              ? 'bg-red-950/60 border-red-500/60 text-red-200'
              : 'bg-emerald-950/70 border-emerald-500/60 text-emerald-200'
          }`}
        >
          {autoEnabled ? (
            <>
              <Square className="w-3 h-3 fill-current" />
              <span>Pause WS</span>
            </>
          ) : (
            <>
              <Play className="w-3 h-3 fill-current" />
              <span>Connect WS</span>
            </>
          )}
        </button>

        <button
          type="button"
          disabled={wsStatus !== 'CONNECTED'}
          onClick={() => {
            haptics.impactLight();
            sound.playClick();
            sendPingPacket();
          }}
          className="py-1.5 px-3 rounded-xl bg-cyan-500/20 border border-cyan-500/60 text-cyan-200 text-[10px] font-mono font-bold flex items-center space-x-1 cursor-pointer disabled:opacity-40"
        >
          <RefreshCw className="w-3 h-3" />
          <span>Ping Now</span>
        </button>

        <button
          type="button"
          onClick={() => {
            haptics.selection();
            sound.playClick();
            setDraftUrl(wsUrl);
            setIsEditingUrl((v) => !v);
          }}
          aria-label="Configure WebSocket Server URL"
          className="p-1.5 rounded-xl bg-[#030b1d] border border-cyan-900/70 text-slate-300 hover:text-cyan-300 cursor-pointer"
        >
          <Settings2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
