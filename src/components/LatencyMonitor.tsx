import React, { useMemo } from 'react';
import * as d3 from 'd3';
import {
  Activity,
  AlertTriangle,
  Lock,
  RefreshCw,
  ShieldCheck,
  Wifi,
} from 'lucide-react';
import { useNetworkDiagnostics } from '../utils/useNetworkDiagnostics.ts';
import { PingHistoryPoint } from '../types.ts';
import { sound } from '../utils/audio.ts';
import { haptics } from '../utils/haptics.ts';

export const LatencyMonitor: React.FC = () => {
  const {
    pingMs,
    jitterMs,
    packetLossPercent,
    stabilityPercent,
    connectionType,
    wifiBand,
    fastDnsServer,
    isRouteLocked,
    qualityLevel,
    qualityLabel,
    qualityReason,
    shouldSuggestSwitch,
    switchAdvisory,
    pingHistory,
    wsConnected,
    isProbingNow,
    probeNow,
    resetAndOptimizeRoute,
  } = useNetworkDiagnostics();

  const qualityStyles =
    qualityLevel === 'green'
      ? {
          cardBorder: 'border-emerald-500/60',
          badge: 'bg-emerald-950/90 border-emerald-400/70 text-emerald-300',
          dot: 'bg-emerald-400',
          stroke: '#34d399',
          areaTop: 'rgba(52, 211, 153, 0.36)',
          pingText: 'text-emerald-300',
        }
      : qualityLevel === 'yellow'
      ? {
          cardBorder: 'border-amber-500/60',
          badge: 'bg-amber-950/90 border-amber-400/70 text-amber-300',
          dot: 'bg-amber-400',
          stroke: '#fbbf24',
          areaTop: 'rgba(251, 191, 36, 0.34)',
          pingText: 'text-amber-300',
        }
      : {
          cardBorder: 'border-red-500/70',
          badge: 'bg-red-950/90 border-red-400/75 text-red-300',
          dot: 'bg-red-400',
          stroke: '#f87171',
          areaTop: 'rgba(248, 113, 113, 0.34)',
          pingText: 'text-red-300',
        };

  // D3 60-Second Ping Line + Area Path Generator (pure React SVG rendering, zero DOM conflicts)
  const chartData = useMemo(() => {
    const width = 340;
    const height = 104;
    const margin = { top: 10, right: 10, bottom: 18, left: 28 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const now = Date.now();
    const series: PingHistoryPoint[] =
      pingHistory.length >= 2
        ? pingHistory
        : pingHistory.length === 1
        ? [
            { ...pingHistory[0], timestamp: pingHistory[0].timestamp - 5000 },
            pingHistory[0],
          ]
        : [
            {
              timestamp: now - 10_000,
              pingMs: pingMs || 0,
              jitterMs: jitterMs || 0,
              packetLossPercent: packetLossPercent || 0,
              quality: qualityLevel,
              source: 'http',
            },
            {
              timestamp: now,
              pingMs: pingMs || 0,
              jitterMs: jitterMs || 0,
              packetLossPercent: packetLossPercent || 0,
              quality: qualityLevel,
              source: 'http',
            },
          ];

    const latestTs = series[series.length - 1].timestamp;
    const minTs = Math.min(series[0].timestamp, latestTs - 60_000);
    const xScale = d3
      .scaleTime()
      .domain([new Date(minTs), new Date(latestTs)])
      .range([0, innerW]);

    const maxPingVal = Math.max(60, ...series.map((d) => d.pingMs), pingMs + 10);
    const yMax = Math.min(350, Math.ceil(maxPingVal / 20) * 20);
    const yScale = d3.scaleLinear().domain([0, yMax]).range([innerH, 0]);

    const lineGen = d3
      .line<PingHistoryPoint>()
      .x((d) => xScale(new Date(d.timestamp)))
      .y((d) => yScale(Math.min(yMax, d.pingMs)))
      .curve(d3.curveMonotoneX);

    const areaGen = d3
      .area<PingHistoryPoint>()
      .x((d) => xScale(new Date(d.timestamp)))
      .y0(innerH)
      .y1((d) => yScale(Math.min(yMax, d.pingMs)))
      .curve(d3.curveMonotoneX);

    const linePath = lineGen(series) || '';
    const areaPath = areaGen(series) || '';
    const target40Y = yScale(40);
    const lastPt = series[series.length - 1];
    const lastX = xScale(new Date(lastPt.timestamp));
    const lastY = yScale(Math.min(yMax, lastPt.pingMs));
    const yTicks = [0, 40, Math.round(yMax / 2), yMax].filter(
      (v, i, arr) => v >= 0 && v <= yMax && arr.indexOf(v) === i
    );

    return {
      width,
      height,
      margin,
      innerW,
      innerH,
      linePath,
      areaPath,
      target40Y,
      lastX,
      lastY,
      yScale,
      yTicks,
      seriesCount: pingHistory.length,
    };
  }, [jitterMs, packetLossPercent, pingHistory, pingMs, qualityLevel]);

  return (
    <section
      aria-label="Live Latency Monitor and 60s Ping History"
      className={`rounded-2xl bg-[#06122c]/95 border ${qualityStyles.cardBorder} p-3.5 shadow-xl space-y-3 transition-colors`}
    >
      {/* Header + Visual Green/Yellow/Red Quality Indicator */}
      <div className="flex items-start justify-between gap-2 pb-2 border-b border-cyan-950/90">
        <div className="flex items-center space-x-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-400/50 flex items-center justify-center text-cyan-300 shrink-0">
            <Wifi className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="font-orbitron font-extrabold text-xs text-white uppercase tracking-wide flex items-center space-x-1.5">
              <span>Latency Monitor (60s)</span>
              <span
                className={`w-2 h-2 rounded-full ${qualityStyles.dot} ${
                  wsConnected ? 'animate-pulse' : ''
                }`}
              />
            </h3>
            <p className="text-[10px] font-mono text-slate-300 truncate">
              {connectionType}
              {wifiBand ? ` ${wifiBand}` : ''} · DNS {fastDnsServer}
            </p>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1 shrink-0">
          <span
            className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border flex items-center space-x-1 whitespace-nowrap ${qualityStyles.badge}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${qualityStyles.dot}`} />
            <span>{qualityLabel}</span>
          </span>
          <span className="text-[9px] font-mono text-cyan-300 flex items-center space-x-1">
            <Lock className="w-2.5 h-2.5" />
            <span>{isRouteLocked ? 'ROUTE LOCKED' : 'AUTO ROUTE'}</span>
          </span>
        </div>
      </div>

      {/* Ping / Jitter / Packet Loss Stats */}
      <div className="grid grid-cols-3 gap-2 text-center font-mono">
        <div className="bg-[#030b1d] border border-cyan-950 rounded-xl p-2">
          <span className="text-[9px] text-slate-400 block">PING</span>
          <span
            className={`font-orbitron font-extrabold text-base tabular-nums block ${qualityStyles.pingText}`}
          >
            {pingMs > 0 ? `${pingMs}ms` : '--'}
          </span>
          <span className="text-[9px] text-slate-400">Target &le;40ms</span>
        </div>

        <div className="bg-[#030b1d] border border-cyan-950 rounded-xl p-2">
          <span className="text-[9px] text-slate-400 block">JITTER</span>
          <span className="font-orbitron font-extrabold text-base text-cyan-300 tabular-nums block">
            ±{jitterMs}ms
          </span>
          <span className="text-[9px] text-slate-400">Stab {stabilityPercent}%</span>
        </div>

        <div className="bg-[#030b1d] border border-cyan-950 rounded-xl p-2">
          <span className="text-[9px] text-slate-400 block">PACKET LOSS</span>
          <span
            className={`font-orbitron font-extrabold text-base tabular-nums block ${
              packetLossPercent > 0 ? 'text-red-400' : 'text-emerald-400'
            }`}
          >
            {packetLossPercent}%
          </span>
          <span className="text-[9px] text-slate-400">
            {wsConnected ? 'WS Live' : 'ICMP/HTTP'}
          </span>
        </div>
      </div>

      {/* Compact D3 60-Second Ping History Chart */}
      <div className="bg-[#030816] border border-cyan-500/30 rounded-xl p-2 space-y-1">
        <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 px-1">
          <span className="flex items-center space-x-1">
            <Activity className="w-3 h-3 text-cyan-400" />
            <span>Ping History (Last 60s)</span>
          </span>
          <span className="tabular-nums">{chartData.seriesCount} samples</span>
        </div>

        <svg
          viewBox={`0 0 ${chartData.width} ${chartData.height}`}
          className="w-full h-24 block"
          role="img"
          aria-label="D3 real-time ping history chart over the last 60 seconds"
        >
          <defs>
            <linearGradient id="latencyMonitorGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={qualityStyles.stroke} stopOpacity="0.38" />
              <stop offset="100%" stopColor="#020817" stopOpacity="0" />
            </linearGradient>
          </defs>

          <g transform={`translate(${chartData.margin.left},${chartData.margin.top})`}>
            {/* Y-axis ticks & subtle grid */}
            {chartData.yTicks.map((t) => {
              const y = chartData.yScale(t);
              return (
                <g key={t}>
                  <line
                    x1={0}
                    x2={chartData.innerW}
                    y1={y}
                    y2={y}
                    stroke="rgba(34,211,238,0.12)"
                    strokeDasharray="2,3"
                  />
                  <text
                    x={-5}
                    y={y + 3}
                    textAnchor="end"
                    fill="#94a3b8"
                    fontSize="8"
                    fontFamily="monospace"
                  >
                    {t}
                  </text>
                </g>
              );
            })}

            {/* 40ms Gaming Target Line */}
            <line
              x1={0}
              x2={chartData.innerW}
              y1={chartData.target40Y}
              y2={chartData.target40Y}
              stroke="#34d399"
              strokeWidth={1}
              strokeDasharray="4,3"
              opacity={0.75}
            />
            <text
              x={chartData.innerW - 2}
              y={Math.max(8, chartData.target40Y - 3)}
              textAnchor="end"
              fill="#34d399"
              fontSize="7.5"
              fontFamily="monospace"
            >
              40ms TARGET
            </text>

            {/* Area & Trajectory */}
            <path d={chartData.areaPath} fill="url(#latencyMonitorGrad)" />
            <path
              d={chartData.linePath}
              fill="none"
              stroke={qualityStyles.stroke}
              strokeWidth={2.2}
              strokeLinecap="round"
            />

            {/* Latest Live Ping Dot */}
            <circle
              cx={chartData.lastX}
              cy={chartData.lastY}
              r={4.5}
              fill={qualityStyles.stroke}
              fillOpacity={0.28}
            />
            <circle
              cx={chartData.lastX}
              cy={chartData.lastY}
              r={2.5}
              fill={qualityStyles.stroke}
              stroke="#030816"
              strokeWidth={1.2}
            />

            {/* X-axis labels */}
            <text
              x={0}
              y={chartData.innerH + 13}
              fill="#64748b"
              fontSize="8"
              fontFamily="monospace"
            >
              -60s
            </text>
            <text
              x={chartData.innerW / 2}
              y={chartData.innerH + 13}
              textAnchor="middle"
              fill="#64748b"
              fontSize="8"
              fontFamily="monospace"
            >
              -30s
            </text>
            <text
              x={chartData.innerW}
              y={chartData.innerH + 13}
              textAnchor="end"
              fill="#94a3b8"
              fontSize="8"
              fontFamily="monospace"
            >
              Live
            </text>
          </g>
        </svg>
      </div>

      {/* Actionable Advisory when Unstable / High Loss */}
      {shouldSuggestSwitch && switchAdvisory ? (
        <div
          role="alert"
          className="p-2.5 rounded-xl bg-red-950/45 border border-red-500/60 text-red-200 text-[10px] font-mono flex items-start space-x-2"
        >
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <strong className="block text-red-300">Network Instability Advisory</strong>
            <span className="leading-snug block">{switchAdvisory}</span>
          </div>
        </div>
      ) : (
        <p className="text-[10px] font-mono text-slate-300 px-0.5 truncate">
          {qualityReason}
        </p>
      )}

      {/* Action Controls */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={isProbingNow}
          onClick={() => {
            haptics.impactLight();
            sound.playClick();
            probeNow();
          }}
          className="min-h-[42px] py-2 px-3 rounded-xl bg-[#040c1f] border border-cyan-700/70 hover:border-cyan-400 text-cyan-200 text-[10px] font-orbitron font-bold uppercase flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isProbingNow ? 'animate-spin' : ''}`} />
          <span>{isProbingNow ? 'Probing...' : 'Measure Ping'}</span>
        </button>

        <button
          type="button"
          disabled={isProbingNow}
          onClick={() => {
            haptics.impactMedium();
            sound.playBoost();
            resetAndOptimizeRoute();
          }}
          className="min-h-[42px] py-2 px-3 rounded-xl bg-emerald-500/20 border border-emerald-400/70 hover:bg-emerald-500/30 text-emerald-200 text-[10px] font-orbitron font-bold uppercase flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Reset Route</span>
        </button>
      </div>
    </section>
  );
};
