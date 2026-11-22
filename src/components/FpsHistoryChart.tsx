import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Activity } from 'lucide-react';
import { FpsHistoryPoint, FPSMode } from '../types.ts';

interface FpsHistoryChartProps {
  data: FpsHistoryPoint[];
  targetFps: FPSMode;
  maxHardwareHz: number;
}

export const FpsHistoryChart: React.FC<FpsHistoryChartProps> = ({
  data,
  targetFps,
  maxHardwareHz,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [hoveredPoint, setHoveredPoint] = useState<FpsHistoryPoint | null>(null);

  const now = Date.now();
  const thirtyMinAgo = now - 30 * 60 * 1000;
  const filtered = data
    .filter((pt) => pt.timestamp >= thirtyMinAgo)
    .sort((a, b) => a.timestamp - b.timestamp);

  // Ensure at least two points for a smooth D3 path even right after boot
  const series: FpsHistoryPoint[] =
    filtered.length >= 2
      ? filtered
      : filtered.length === 1
      ? [
          { ...filtered[0], timestamp: filtered[0].timestamp - 60_000 },
          filtered[0],
        ]
      : [
          {
            timestamp: now - 60_000,
            fps: Number(targetFps) || 60,
            targetFps: Number(targetFps) || 60,
            profile: 'SMART_BOOST',
          },
          {
            timestamp: now,
            fps: Number(targetFps) || 60,
            targetFps: Number(targetFps) || 60,
            profile: 'SMART_BOOST',
          },
        ];

  const fpsValues = series.map((d) => d.fps);
  const minFps = Math.min(...fpsValues);
  const maxFps = Math.max(...fpsValues);
  const avgFps = Math.round(fpsValues.reduce((s, v) => s + v, 0) / fpsValues.length);
  const targetNum = Math.min(Number(targetFps) || 60, maxHardwareHz || 120);

  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl) return;

    const width = 340;
    const height = 128;
    const margin = { top: 12, right: 12, bottom: 22, left: 28 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const svg = d3.select(svgEl);
    svg.selectAll('*').remove();

    const defs = svg.append('defs');
    const areaGradient = defs
      .append('linearGradient')
      .attr('id', 'fpsAreaGrad')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');
    areaGradient.append('stop').attr('offset', '0%').attr('stop-color', '#06b6d4').attr('stop-opacity', 0.45);
    areaGradient.append('stop').attr('offset', '100%').attr('stop-color', '#06b6d4').attr('stop-opacity', 0.02);

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const xMin = Math.min(series[0].timestamp, now - 5 * 60 * 1000);
    const xMax = Math.max(series[series.length - 1].timestamp, now);
    const xScale = d3.scaleTime().domain([new Date(xMin), new Date(xMax)]).range([0, innerW]);

    const yMaxVal = Math.max(120, maxHardwareHz || 120, maxFps + 5);
    const yScale = d3.scaleLinear().domain([0, yMaxVal]).nice().range([innerH, 0]);

    // Horizontal gridlines
    const yTicks = [30, 60, 90, 120].filter((t) => t <= yMaxVal);
    g.selectAll('.fps-grid')
      .data(yTicks)
      .enter()
      .append('line')
      .attr('class', 'fps-grid')
      .attr('x1', 0)
      .attr('x2', innerW)
      .attr('y1', (d) => yScale(d))
      .attr('y2', (d) => yScale(d))
      .attr('stroke', 'rgba(14, 116, 144, 0.28)')
      .attr('stroke-dasharray', '2,3');

    // Target FPS threshold line
    g.append('line')
      .attr('x1', 0)
      .attr('x2', innerW)
      .attr('y1', yScale(targetNum))
      .attr('y2', yScale(targetNum))
      .attr('stroke', '#34d399')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '4,3')
      .attr('opacity', 0.75);

    // Area + Line
    const areaGen = d3
      .area<FpsHistoryPoint>()
      .x((d) => xScale(new Date(d.timestamp)))
      .y0(innerH)
      .y1((d) => yScale(d.fps))
      .curve(d3.curveMonotoneX);

    g.append('path').datum(series).attr('fill', 'url(#fpsAreaGrad)').attr('d', areaGen);

    const lineGen = d3
      .line<FpsHistoryPoint>()
      .x((d) => xScale(new Date(d.timestamp)))
      .y((d) => yScale(d.fps))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(series)
      .attr('fill', 'none')
      .attr('stroke', '#22d3ee')
      .attr('stroke-width', 2.2)
      .attr('stroke-linecap', 'round')
      .attr('d', lineGen);

    // Axes
    const xAxis = d3
      .axisBottom<Date>(xScale)
      .ticks(4)
      .tickSize(0)
      .tickFormat((d) => d3.timeFormat('%H:%M')(d));

    g.append('g')
      .attr('transform', `translate(0,${innerH + 4})`)
      .call(xAxis)
      .call((axis) => axis.select('.domain').remove())
      .selectAll('text')
      .attr('fill', '#64748b')
      .attr('font-size', '8.5px')
      .attr('font-family', 'monospace');

    const yAxis = d3.axisLeft<number>(yScale).tickValues(yTicks).tickSize(0);
    g.append('g')
      .call(yAxis)
      .call((axis) => axis.select('.domain').remove())
      .selectAll('text')
      .attr('fill', '#64748b')
      .attr('font-size', '8.5px')
      .attr('font-family', 'monospace');

    // Interactive focus dot & overlay
    const focusGroup = g.append('g').style('display', 'none');
    focusGroup
      .append('line')
      .attr('class', 'focus-line')
      .attr('y1', 0)
      .attr('y2', innerH)
      .attr('stroke', '#22d3ee')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '2,2')
      .attr('opacity', 0.7);
    focusGroup
      .append('circle')
      .attr('r', 4)
      .attr('fill', '#22d3ee')
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
  }, [series, targetNum, maxHardwareHz, maxFps, now]);

  return (
    <div className="bg-[#071129]/95 border border-cyan-800/70 rounded-2xl p-3.5 shadow-xl space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-lg bg-cyan-500/15 border border-cyan-400/50 flex items-center justify-center text-cyan-400">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-orbitron font-bold text-xs text-white uppercase tracking-wide">
              FPS Performance History (30m)
            </h4>
            <p className="text-[10px] text-slate-400 font-mono">
              {hoveredPoint
                ? `${hoveredPoint.fps} FPS at ${new Date(hoveredPoint.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}`
                : `${filtered.length} recorded frames • Target ${targetNum} FPS`}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-1.5 text-[10px] font-mono shrink-0">
          <span className="px-1.5 py-0.5 rounded bg-emerald-950/80 border border-emerald-700/50 text-emerald-300 font-bold">
            AVG {avgFps}
          </span>
          <span className="px-1.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-700/50 text-cyan-300 font-bold">
            {minFps}-{maxFps}
          </span>
        </div>
      </div>

      <div className="w-full bg-[#040a1a] border border-cyan-950/90 rounded-xl p-1.5 overflow-hidden">
        <svg
          ref={svgRef}
          viewBox="0 0 340 128"
          className="w-full h-32 block touch-pan-y"
          role="img"
          aria-label="30-minute FPS performance fluctuation history graph"
        />
      </div>
    </div>
  );
};
