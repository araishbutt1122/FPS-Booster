import React, { useMemo, useState } from 'react';
import {
  Thermometer,
  Flame,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  Snowflake,
  ShieldAlert,
} from 'lucide-react';
import { ThermalMonitorState } from '../types.ts';
import { celsiusToFahrenheit } from '../utils/thermalMonitor.ts';

interface ThermalMonitorPanelProps {
  thermal: ThermalMonitorState;
  isInGamingSession: boolean;
  onRefresh: () => Promise<void>;
  onChangeThreshold: (celsius: number) => void;
  onToggleAutoCool: () => void;
  onApplyCooldown: () => Promise<void>;
}

const THRESHOLD_OPTIONS = [39, 41, 43];

export const ThermalMonitorPanel: React.FC<ThermalMonitorPanelProps> = ({
  thermal,
  isInGamingSession,
  onRefresh,
  onChangeThreshold,
  onToggleAutoCool,
  onApplyCooldown,
}) => {
  const [isScanning, setIsScanning] = useState(false);

  const handleScan = async () => {
    setIsScanning(true);
    try {
      await onRefresh();
    } finally {
      setTimeout(() => setIsScanning(false), 450);
    }
  };

  const severityMeta = useMemo(() => {
    switch (thermal.severity) {
      case 'critical':
        return {
          label: 'CRITICAL HEAT',
          border: 'border-red-500/80',
          bg: 'bg-red-950/35',
          text: 'text-red-300',
          tempColor: 'text-red-400',
          barColor: '#ef4444',
          Icon: ShieldAlert,
        };
      case 'high':
        return {
          label: 'HIGH TEMP',
          border: 'border-orange-500/80',
          bg: 'bg-orange-950/35',
          text: 'text-orange-300',
          tempColor: 'text-orange-400',
          barColor: '#f97316',
          Icon: AlertTriangle,
        };
      case 'warm':
        return {
          label: 'WARM',
          border: 'border-amber-500/60',
          bg: 'bg-amber-950/25',
          text: 'text-amber-300',
          tempColor: 'text-amber-300',
          barColor: '#f59e0b',
          Icon: Flame,
        };
      default:
        return {
          label: 'COOL / SAFE',
          border: 'border-cyan-800/70',
          bg: 'bg-[#071129]/95',
          text: 'text-emerald-300',
          tempColor: 'text-cyan-300',
          barColor: '#22d3ee',
          Icon: CheckCircle2,
        };
    }
  }, [thermal.severity]);

  const trendMeta = useMemo(() => {
    if (thermal.trend === 'rising') {
      return {
        label: `Rising (+${Math.abs(thermal.deltaPerMin).toFixed(1)}°C/m)`,
        color: 'text-amber-300',
        Icon: TrendingUp,
      };
    }
    if (thermal.trend === 'cooling') {
      return {
        label: `Cooling (-${Math.abs(thermal.deltaPerMin).toFixed(1)}°C/m)`,
        color: 'text-emerald-300',
        Icon: TrendingDown,
      };
    }
    return {
      label: 'Stable',
      color: 'text-slate-300',
      Icon: Minus,
    };
  }, [thermal.trend, thermal.deltaPerMin]);

  // Build SVG sparkline path over thermal history
  const chartData = useMemo(() => {
    const pts =
      thermal.history.length >= 2
        ? thermal.history.slice(-24)
        : [
            { timestamp: Date.now() - 10000, tempC: thermal.currentTempC, severity: thermal.severity },
            { timestamp: Date.now(), tempC: thermal.currentTempC, severity: thermal.severity },
          ];

    const w = 316;
    const h = 68;
    const padX = 6;
    const padY = 8;
    const minT = Math.min(28, ...pts.map((p) => p.tempC)) - 1;
    const maxT = Math.max(thermal.alertThresholdC + 4, ...pts.map((p) => p.tempC)) + 1;
    const range = Math.max(4, maxT - minT);

    const coords = pts.map((p, idx) => {
      const x = padX + (idx / Math.max(1, pts.length - 1)) * (w - padX * 2);
      const y = h - padY - ((p.tempC - minT) / range) * (h - padY * 2);
      return { x, y, p };
    });

    const linePath = coords
      .map((c, idx) => `${idx === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
      .join(' ');
    const areaPath = `${linePath} L ${coords[coords.length - 1].x.toFixed(1)} ${h - padY} L ${coords[0].x.toFixed(1)} ${h - padY} Z`;
    const thresholdY = h - padY - ((thermal.alertThresholdC - minT) / range) * (h - padY * 2);

    return { w, h, linePath, areaPath, thresholdY, lastCoord: coords[coords.length - 1] };
  }, [thermal.history, thermal.currentTempC, thermal.severity, thermal.alertThresholdC]);

  const SeverityIcon = severityMeta.Icon;
  const TrendIcon = trendMeta.Icon;

  return (
    <section
      aria-label="Device Temperature Monitor"
      className={`rounded-2xl border p-4 shadow-xl space-y-3 transition-colors ${severityMeta.bg} ${severityMeta.border}`}
    >
      {/* Header Row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center space-x-2 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-black/35 border border-white/10 flex items-center justify-center shrink-0">
            <Thermometer className={`w-4 h-4 ${severityMeta.tempColor}`} />
          </div>
          <div className="min-w-0">
            <h4 className="font-orbitron font-bold text-xs text-white uppercase tracking-wide truncate">
              Device Thermal Monitor
            </h4>
            <p className="text-[10px] font-mono text-slate-400 truncate">
              {thermal.sensorSource}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleScan}
          disabled={isScanning}
          className="min-h-[36px] px-3 py-1.5 rounded-xl bg-cyan-500/15 border border-cyan-500/40 hover:bg-cyan-500/25 text-cyan-300 text-[10px] font-mono font-bold flex items-center space-x-1.5 cursor-pointer shrink-0 disabled:opacity-60 whitespace-nowrap"
        >
          <RefreshCw className={`w-3 h-3 ${isScanning ? 'animate-spin' : ''}`} />
          <span>{isScanning ? 'Scanning' : 'Scan'}</span>
        </button>
      </div>

      {/* Primary Temperature & State Readout */}
      <div className="flex items-end justify-between gap-3 bg-black/30 border border-white/10 rounded-xl p-3">
        <div>
          <div className="flex items-baseline space-x-2">
            <span className={`font-orbitron font-black text-2xl tabular-nums ${severityMeta.tempColor}`}>
              {thermal.currentTempC.toFixed(1)}°C
            </span>
            <span className="text-xs font-mono text-slate-400 tabular-nums">
              / {celsiusToFahrenheit(thermal.currentTempC)}°F
            </span>
          </div>
          <div className="flex items-center space-x-1.5 text-[11px] font-mono mt-1">
            <SeverityIcon className={`w-3.5 h-3.5 shrink-0 ${severityMeta.text}`} />
            <span className={`font-bold ${severityMeta.text}`}>{severityMeta.label}</span>
            <span aria-hidden="true" className="text-slate-500">·</span>
            <span className={`flex items-center space-x-1 ${trendMeta.color}`}>
              <TrendIcon className="w-3 h-3 shrink-0" />
              <span>{trendMeta.label}</span>
            </span>
          </div>
        </div>

        <div className="text-right font-mono text-[10px] space-y-0.5 shrink-0">
          <div className="text-slate-300 tabular-nums">
            Peak: <strong className="text-white">{thermal.peakSessionTempC.toFixed(1)}°C</strong>
          </div>
          <div className="text-slate-400 tabular-nums">
            Limit: <strong className="text-amber-300">{thermal.alertThresholdC}°C</strong>
          </div>
        </div>
      </div>

      {/* Clean Unboxed Sensor Metadata Breakdown */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] font-mono text-slate-300 px-0.5 tabular-nums">
        <span>
          OS Thermal: <strong className="text-white">{thermal.thermalStatus}</strong>
        </span>
        {thermal.batteryTempC !== null && (
          <>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span>
              Battery: <strong className="text-cyan-300">{thermal.batteryTempC.toFixed(1)}°C</strong>
            </span>
          </>
        )}
        {thermal.cpuTempC !== null && (
          <>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span>
              SoC/CPU: <strong className="text-amber-300">{thermal.cpuTempC.toFixed(1)}°C</strong>
            </span>
          </>
        )}
        {thermal.thermalHeadroom !== null && (
          <>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span>
              Headroom: <strong className="text-emerald-300">{Math.max(0, Math.round((1 - thermal.thermalHeadroom) * 100))}%</strong>
            </span>
          </>
        )}
        {thermal.cpuPressureState && (
          <>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span>
              CPU Load: <strong className="text-cyan-300 capitalize">{thermal.cpuPressureState}</strong>
            </span>
          </>
        )}
      </div>

      {/* Session Thermal Trend Sparkline */}
      <div className="bg-[#040a1a] border border-cyan-950/90 rounded-xl p-2">
        <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 mb-1">
          <span>{isInGamingSession ? 'Gaming Session Thermal Curve' : 'Live Thermal Curve'}</span>
          <span className="text-amber-400/90">Dashed: {thermal.alertThresholdC}°C Warning</span>
        </div>
        <svg
          viewBox={`0 0 ${chartData.w} ${chartData.h}`}
          className="w-full h-16 block"
          role="img"
          aria-label="Device temperature progression chart"
        >
          <defs>
            <linearGradient id="thermalAreaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={severityMeta.barColor} stopOpacity="0.35" />
              <stop offset="100%" stopColor={severityMeta.barColor} stopOpacity="0.02" />
            </linearGradient>
          </defs>
          <line
            x1="4"
            x2={chartData.w - 4}
            y1={chartData.thresholdY}
            y2={chartData.thresholdY}
            stroke="#f59e0b"
            strokeWidth="1"
            strokeDasharray="4,3"
            opacity="0.7"
          />
          <path d={chartData.areaPath} fill="url(#thermalAreaGrad)" />
          <path
            d={chartData.linePath}
            fill="none"
            stroke={severityMeta.barColor}
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle
            cx={chartData.lastCoord.x}
            cy={chartData.lastCoord.y}
            r="3.5"
            fill={severityMeta.barColor}
            stroke="#040a1a"
            strokeWidth="1.5"
          />
        </svg>
      </div>

      {/* Native Android Thermal Zones (if exposed by kernel) */}
      {thermal.zones.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] font-mono text-slate-400 px-0.5 tabular-nums">
          <span className="text-slate-500">Zones:</span>
          {thermal.zones.slice(0, 4).map((z, idx) => (
            <React.Fragment key={`${z.type}_${idx}`}>
              {idx > 0 && <span aria-hidden="true" className="text-slate-600">·</span>}
              <span>
                {z.type}: <strong className="text-slate-200">{z.tempC.toFixed(1)}°C</strong>
              </span>
            </React.Fragment>
          ))}
        </div>
      )}

      {/* Interactive Warning Threshold & Auto-Cool Controls */}
      <div className="pt-1 border-t border-white/10 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-1.5">
          <span className="text-[10px] font-mono text-slate-400">Warn At:</span>
          <div className="flex items-center bg-black/40 border border-slate-800 rounded-lg p-0.5">
            {THRESHOLD_OPTIONS.map((deg) => {
              const selected = thermal.alertThresholdC === deg;
              return (
                <button
                  key={deg}
                  type="button"
                  onClick={() => onChangeThreshold(deg)}
                  className={`px-2 py-1 rounded-md text-[10px] font-mono font-bold transition-colors cursor-pointer whitespace-nowrap ${
                    selected
                      ? 'bg-amber-400 text-black'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {deg}°C
                </button>
              );
            })}
          </div>
        </div>

        <button
          type="button"
          onClick={onToggleAutoCool}
          className={`min-h-[34px] px-2.5 py-1 rounded-lg border text-[10px] font-mono font-bold flex items-center space-x-1.5 cursor-pointer transition-colors whitespace-nowrap ${
            thermal.autoCoolEnabled
              ? 'bg-emerald-950/80 border-emerald-500/70 text-emerald-300'
              : 'bg-black/40 border-slate-700 text-slate-300 hover:border-cyan-600'
          }`}
          title="Automatically switch to 60 FPS Balanced profile when high thermal load occurs"
        >
          <Snowflake className="w-3.5 h-3.5 shrink-0" />
          <span>Auto-Cool 60Hz: {thermal.autoCoolEnabled ? 'ON' : 'OFF'}</span>
        </button>
      </div>

      {/* Quick Cooling Action if Warm/High/Critical */}
      {(thermal.severity === 'high' || thermal.severity === 'critical') && (
        <button
          type="button"
          onClick={onApplyCooldown}
          className="w-full min-h-[40px] py-2 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-orbitron font-bold text-xs uppercase tracking-wide flex items-center justify-center space-x-2 cursor-pointer transition-colors"
        >
          <Snowflake className="w-4 h-4 shrink-0" />
          <span>Engage 60 FPS Cooling Profile</span>
        </button>
      )}
    </section>
  );
};
