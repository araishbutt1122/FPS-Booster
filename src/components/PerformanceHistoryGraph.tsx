import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Activity } from 'lucide-react';
import { useBooster } from '../context/BoosterContext.tsx';
import { FpsHistoryPoint, FPSMode } from '../types.ts';

interface PerformanceHistoryGraphProps {
  data?: FpsHistoryPoint[];
  targetFps?: FPSMode;
  maxHardwareHz?: number;
}

type TimeWindowMinutes = 30 | 15 | 5;

export const PerformanceHistoryGraph: React.FC<PerformanceHistoryGraphProps> = ({
  data: propData,
  targetFps: propTargetFps,
  maxHardwareHz: propMaxHz,
}) => {
  const { fpsHistory, state } = useBooster();
  const data = propData ?? fpsHistory;
  const targetFps = propTargetFps ?? state.activeFps;
  const maxHardwareHz = propMaxHz ?? state.maxHardwareHz;

  const svgRef = useRef<SVGSVGElement | null>(null);
  const [windowMinutes, setWindowMinutes] = useState<TimeWindowMinutes>(30);
  const [hoveredPoint, setHoveredPoint] = useState<FpsHistoryPoint | null>(null);

  const {
    filteredCount,
    series,
    minFps,
    maxFps,
    avgFps,
    stabilityPct,
    targetNum,
    liveFps,
  } = useMemo(() => {
    const anchorNow = data.length > 0 ? data[data.length - 1].timestamp : Date.now();
    const cutoff = anchorNow - windowMinutes * 60 * 1000;
    const filtered = data
      .filter((pt) => pt.timestamp >= cutoff)
      .sort((a, b) => a.timestamp - b.timestamp);

    const safeTarget = Number(targetFps) || 60;
    const tNum = Math.min(safeTarget, maxHardwareHz || 120);
    const currentLive = state.currentFps || safeTarget;

    const computedSeries: FpsHistoryPoint[] =
      filtered.length >= 2
        ? filtered
        : filtered.length === 1
        ? [
            {
              ...filtered[0],
              timestamp: filtered[0].timestamp - 60_000,
              fps: currentLive,
            },
            filtered[0],
          ]
        : [
            {
              timestamp: anchorNow - 60_000,
              fps: currentLive,
              targetFps: tNum,
              profile: state.activeProfile || 'SMART_BOOST',
            },
            {
              timestamp: anchorNow,
              fps: currentLive,
              targetFps: tNum,
              profile: state.activeProfile || 'SMART_BOOST',
            },
          ];

    const fpsValues = computedSeries.map((d) => d.fps);
    const minVal = Math.min(...fpsValues);
    const maxVal = Math.max(...fpsValues);
    const avgVal = Math.round(fpsValues.reduce((s, v) => s + v, 0) / fpsValues.length);
    const stableThreshold = tNum * 0.85;
    const stableSamples = fpsValues.filter((v) => v >= stableThreshold).length;
    const stability = Math.round((stableSamples / fpsValues.length) * 100);

    return {
      filteredCount: filtered.length,
      series: computedSeries,
      minFps: minVal,
      maxFps: maxVal,
      avgFps: avgVal,
      stabilityPct: stability,
      targetNum: tNum,
      liveFps: currentLive,
    };
  }, [data, targetFps, maxHardwareHz, windowMinutes, state.currentFps, state.activeProfile]);

  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl || series.length === 0) return;

    const width = 340;
    const height = 142;
    const margin = { top: 14, right: 14, bottom: 24, left: 30 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const svg = d3.select(svgEl);
    svg.selectAll('*').remove();

    const defs = svg.append('defs');

    // Neon cyan area gradient under the curve
    const areaGradient = defs
      .append('linearGradient')
      .attr('id', 'perfNeonAreaGrad')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');
    areaGradient.append('stop').attr('offset', '0%').attr('stop-color', '#00e5ff').attr('stop-opacity', 0.42);
    areaGradient.append('stop').attr('offset', '65%').attr('stop-color', '#06b6d4').attr('stop-opacity', 0.12);
    areaGradient.append('stop').attr('offset', '100%').attr('stop-color', '#020817').attr('stop-opacity', 0);

    // Neon glow filter for the FPS trajectory stroke
    const glowFilter = defs
      .append('filter')
      .attr('id', 'perfNeonGlow')
      .attr('x', '-15%')
      .attr('y', '-25%')
      .attr('width', '130%')
      .attr('height', '150%');
    glowFilter
      .append('feGaussianBlur')
      .attr('stdDeviation', '2.5')
      .attr('result', 'coloredBlur');
    const feMerge = glowFilter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const latestTs = series[series.length - 1].timestamp;
    const minWindowStart = latestTs - Math.min(windowMinutes, 30) * 60 * 1000;
    const xMin = Math.max(minWindowStart, Math.min(series[0].timestamp, latestTs - 2 * 60 * 1000));
    const xMax = latestTs;
    const xScale = d3.scaleTime().domain([new Date(xMin), new Date(xMax)]).range([0, innerW]);

    const yMaxVal = Math.max(120, maxHardwareHz || 120, maxFps + 8);
    const yScale = d3.scaleLinear().domain([0, yMaxVal]).nice().range([innerH, 0]);

    // Horizontal reference gridlines
    const yTicks = [30, 60, 90, 120].filter((t) => t <= yMaxVal);
    g.selectAll('.perf-grid')
      .data(yTicks)
      .enter()
      .append('line')
      .attr('class', 'perf-grid')
      .attr('x1', 0)
      .attr('x2', innerW)
      .attr('y1', (d) => yScale(d))
      .attr('y2', (d) => yScale(d))
      .attr('stroke', 'rgba(34, 211, 238, 0.14)')
      .attr('stroke-dasharray', '2,3');

    // Target FPS dashed threshold line
    g.append('line')
      .attr('x1', 0)
      .attr('x2', innerW)
      .attr('y1', yScale(targetNum))
      .attr('y2', yScale(targetNum))
      .attr('stroke', '#34d399')
      .attr('stroke-width', 1.1)
      .attr('stroke-dasharray', '4,3')
      .attr('opacity', 0.85);

    g.append('text')
      .attr('x', innerW - 2)
      .attr('y', Math.max(10, yScale(targetNum) - 4))
      .attr('text-anchor', 'end')
      .attr('fill', '#34d399')
      .attr('font-size', '8px')
      .attr('font-family', 'monospace')
      .text(`TARGET ${targetNum}`);

    // Neon shaded area under curve
    const areaGen = d3
      .area<FpsHistoryPoint>()
      .x((d) => xScale(new Date(d.timestamp)))
      .y0(innerH)
      .y1((d) => yScale(d.fps))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(series)
      .attr('fill', 'url(#perfNeonAreaGrad)')
      .attr('d', areaGen);

    // Primary neon cyan FPS line with glow filter
    const lineGen = d3
      .line<FpsHistoryPoint>()
      .x((d) => xScale(new Date(d.timestamp)))
      .y((d) => yScale(d.fps))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(series)
      .attr('fill', 'none')
      .attr('stroke', '#00e5ff')
      .attr('stroke-width', 2.4)
      .attr('stroke-linecap', 'round')
      .attr('filter', 'url(#perfNeonGlow)')
      .attr('d', lineGen);

    // Live endpoint glowing node
    const lastPt = series[series.length - 1];
    g.append('circle')
      .attr('cx', xScale(new Date(lastPt.timestamp)))
      .attr('cy', yScale(lastPt.fps))
      .attr('r', 4.5)
      .attr('fill', '#00e5ff')
      .attr('fill-opacity', 0.25);

    g.append('circle')
      .attr('cx', xScale(new Date(lastPt.timestamp)))
      .attr('cy', yScale(lastPt.fps))
      .attr('r', 2.6)
      .attr('fill', '#67e8f9')
      .attr('stroke', '#040a1a')
      .attr('stroke-width', 1.2);

    // Bottom Time Axis
    const xAxis = d3
      .axisBottom<Date>(xScale)
      .ticks(4)
      .tickSize(0)
      .tickFormat((d) => d3.timeFormat('%H:%M')(d));

    g.append('g')
      .attr('transform', `translate(0,${innerH + 5})`)
      .call(xAxis)
      .call((axis) => axis.select('.domain').remove())
      .selectAll('text')
      .attr('fill', '#94a3b8')
      .attr('font-size', '8.5px')
      .attr('font-family', 'monospace');

    // Left FPS Axis
    const yAxis = d3.axisLeft<number>(yScale).tickValues(yTicks).tickSize(0);
    g.append('g')
      .call(yAxis)
      .call((axis) => axis.select('.domain').remove())
      .selectAll('text')
      .attr('fill', '#94a3b8')
      .attr('font-size', '8.5px')
      .attr('font-family', 'monospace');

    // Interactive hover/touch focus crosshair
    const focusGroup = g.append('g').style('display', 'none');
    focusGroup
      .append('line')
      .attr('class', 'focus-line')
      .attr('y1', 0)
      .attr('y2', innerH)
      .attr('stroke', '#00e5ff')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '2,2')
      .attr('opacity', 0.75);
    focusGroup
      .append('circle')
      .attr('r', 4.2)
      .attr('fill', '#00e5ff')
      .attr('stroke', '#050A1A')
      .attr('stroke-width', 1.5);

    const bisectTime = d3.bisector<FpsHistoryPoint, number>((d) => d.timestamp).left;

    g.append('rect')
      .attr('width', innerW)
      .attr('height', innerH)
      .attr('fill', 'transparent')
      .style('cursor', 'crosshair')
      .on('mousemove touchmove', function (event: MouseEvent | TouchEvent) {
        const [mx] = d3.pointer(event, this);
        const hoveredDate = xScale.invert(mx).getTime();
        const idx = bisectTime(series, hoveredDate, 1);
        const d0 = series[idx - 1];
        const d1 = series[idx] || d0;
        const nearest =
          !d1 || hoveredDate - d0.timestamp < d1.timestamp - hoveredDate ? d0 : d1;

        if (nearest) {
          focusGroup.style('display', null);
          const cx = xScale(new Date(nearest.timestamp));
          const cy = yScale(nearest.fps);
          focusGroup.select('.focus-line').attr('x1', cx).attr('x2', cx);
          focusGroup.select('circle').attr('cx', cx).attr('cy', cy);
          setHoveredPoint(nearest);
        }
      })
      .on('mouseleave touchend', () => {
        focusGroup.style('display', 'none');
        setHoveredPoint(null);
      });
  }, [series, targetNum, maxHardwareHz, maxFps, windowMinutes]);

  const activeWindowOptions: TimeWindowMinutes[] = [30, 15, 5];

  return (
    <section
      aria-label="FPS Performance History Graph"
      className="bg-[#071129]/95 border border-cyan-500/50 rounded-2xl p-3.5 shadow-[0_0_24px_rgba(6,182,212,0.16)] space-y-2.5"
    >
      {/* Header Row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center space-x-2 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-400/60 flex items-center justify-center text-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.28)] shrink-0">
            <Activity className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h4 className="font-orbitron font-bold text-xs text-white uppercase tracking-wide truncate">
              Performance History ({windowMinutes}m)
            </h4>
            <p className="text-[10px] text-slate-300 font-mono truncate tabular-nums">
              {hoveredPoint
                ? `${hoveredPoint.fps} FPS (${hoveredPoint.profile.replace('_', ' ')}) · ${new Date(
                    hoveredPoint.timestamp
                  ).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}`
                : `${filteredCount} samples · Live ${liveFps} FPS · ${state.activeProfile.replace('_', ' ')}`}
            </p>
          </div>
        </div>

        {/* Interactive Time-Range Segmented Control */}
        <div className="flex items-center bg-[#040a1a] border border-cyan-900/70 rounded-lg p-0.5 shrink-0">
          {activeWindowOptions.map((mins) => {
            const active = windowMinutes === mins;
            return (
              <button
                key={mins}
                type="button"
                onClick={() => setWindowMinutes(mins)}
                className={`px-2 py-1 rounded-md text-[10px] font-mono font-bold transition-colors cursor-pointer whitespace-nowrap ${
                  active
                    ? 'bg-cyan-400 text-black shadow-[0_0_10px_rgba(34,211,238,0.5)]'
                    : 'text-slate-400 hover:text-cyan-200'
                }`}
              >
                {mins}m
              </button>
            );
          })}
        </div>
      </div>

      {/* D3 Neon Chart Canvas */}
      <div className="w-full bg-[#030816] border border-cyan-500/30 rounded-xl p-1.5 overflow-hidden">
        <svg
          ref={svgRef}
          viewBox="0 0 340 142"
          className="w-full h-36 block touch-pan-y"
          role="img"
          aria-label="Neon line chart of FPS fluctuations over the last 30 minutes"
        />
      </div>

      {/* Tabular Summary Metrics */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono text-slate-300 px-0.5 tabular-nums">
        <span>
          Avg: <strong className="text-cyan-300">{avgFps} FPS</strong>
          <span aria-hidden="true" className="mx-1.5 text-slate-600">·</span>
          Range: <strong className="text-white">{minFps}-{maxFps}</strong>
        </span>
        <span>
          Stability: <strong className={stabilityPct >= 85 ? 'text-emerald-300' : 'text-amber-300'}>{stabilityPct}%</strong>
          <span aria-hidden="true" className="mx-1.5 text-slate-600">·</span>
          Max: <strong className="text-cyan-300">{maxHardwareHz}Hz</strong>
        </span>
      </div>
    </section>
  );
};
