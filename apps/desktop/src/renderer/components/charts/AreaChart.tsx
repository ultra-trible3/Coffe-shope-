import { useState, type ReactElement } from 'react';
import { useI18n } from '../../i18n';
import { cn } from '../../lib/utils';

export interface ChartPoint {
  label: string;
  value: number;
}

const WIDTH = 800;
const HEIGHT = 260;
const PAD = { top: 18, right: 14, bottom: 34, left: 58 };

function niceMax(value: number): number {
  if (value <= 0) return 10;
  const exponent = Math.floor(Math.log10(value));
  const magnitude = 10 ** exponent;
  const normalized = value / magnitude;
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
}

/** Catmull-Rom → cubic Bézier, keeping the curve inside the plot band. */
function smoothPath(points: Array<{ x: number; y: number }>): string {
  if (points.length === 0) return '';
  if (points.length < 3) {
    return points.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x},${point.y}`).join(' ');
  }
  let path = `M${points[0]!.x},${points[0]!.y}`;
  for (let index = 0; index < points.length - 1; index += 1) {
    const p0 = points[Math.max(index - 1, 0)]!;
    const p1 = points[index]!;
    const p2 = points[index + 1]!;
    const p3 = points[Math.min(index + 2, points.length - 1)]!;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    path += ` C${c1x},${c1y} ${c2x},${c2y} ${p2.x},${p2.y}`;
  }
  return path;
}

export function AreaChart({
  data,
  formatValue,
  color = '#A9682F',
  className,
  emptyLabel,
}: {
  data: ChartPoint[];
  formatValue: (value: number) => string;
  color?: string;
  className?: string;
  emptyLabel?: string;
}): ReactElement {
  const { t } = useI18n();
  const [hovered, setHovered] = useState<number | null>(null);
  const gradientId = `area-${color.replace(/[^a-z0-9]/giu, '')}`;

  if (data.length === 0) {
    return (
      <div className={cn('flex h-[260px] items-center justify-center text-sm text-muted-foreground', className)}>
        {emptyLabel ?? t('charts.noData')}
      </div>
    );
  }

  const max = niceMax(Math.max(...data.map((point) => point.value), 0));
  const plotWidth = WIDTH - PAD.left - PAD.right;
  const plotHeight = HEIGHT - PAD.top - PAD.bottom;
  const baseY = PAD.top + plotHeight;
  const x = (index: number): number =>
    PAD.left + (index * plotWidth) / Math.max(data.length - 1, 1);
  const y = (value: number): number => PAD.top + (1 - Math.max(value, 0) / max) * plotHeight;
  const points = data.map((point, index) => ({ x: x(index), y: y(point.value) }));
  const line = smoothPath(points);
  const area = `${line} L${points[points.length - 1]!.x},${baseY} L${points[0]!.x},${baseY} Z`;
  const tickCount = 4;
  const ticks = Array.from({ length: tickCount + 1 }, (_, index) => (max / tickCount) * index);
  const labelEvery = Math.max(1, Math.ceil(data.length / 8));
  const active = hovered !== null ? data[hovered] : null;
  const activePoint = hovered !== null ? points[hovered] : null;

  return (
    <div className={cn('relative', className)}>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full"
        role="img"
        aria-label={t('charts.trendAria')}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.24} />
            <stop offset="100%" stopColor={color} stopOpacity={0.01} />
          </linearGradient>
        </defs>

        {ticks.map((tick) => (
          <g key={tick}>
            <line
              x1={PAD.left}
              x2={WIDTH - PAD.right}
              y1={y(tick)}
              y2={y(tick)}
              stroke="currentColor"
              strokeWidth={1}
              className="text-border"
              strokeDasharray={tick === 0 ? undefined : '3 5'}
            />
            <text
              x={PAD.left - 10}
              y={y(tick) + 3.5}
              textAnchor="end"
              className="fill-muted-foreground text-[10px]"
            >
              {formatValue(tick)}
            </text>
          </g>
        ))}

        <path d={area} fill={`url(#${gradientId})`} />
        <path d={line} fill="none" stroke={color} strokeWidth={2.4} strokeLinecap="round" />

        {data.map((point, index) =>
          index % labelEvery === 0 || index === data.length - 1 ? (
            <text
              key={`${point.label}-${index}`}
              x={x(index)}
              y={HEIGHT - 10}
              textAnchor="middle"
              className="fill-muted-foreground text-[10px]"
            >
              {point.label}
            </text>
          ) : null,
        )}

        {activePoint ? (
          <g>
            <line
              x1={activePoint.x}
              x2={activePoint.x}
              y1={PAD.top}
              y2={baseY}
              stroke={color}
              strokeOpacity={0.35}
              strokeDasharray="4 4"
            />
            <circle cx={activePoint.x} cy={activePoint.y} r={5} fill={color} stroke="#fff" strokeWidth={2} />
          </g>
        ) : null}
      </svg>

      <div className="absolute inset-x-0 top-0 flex" style={{ left: PAD.left / WIDTH * 100 + '%', right: PAD.right / WIDTH * 100 + '%', height: `${((PAD.top + plotHeight) / HEIGHT) * 100}%` }}>
        {data.map((point, index) => (
          <button
            key={`${point.label}-hit-${index}`}
            type="button"
            className="h-full flex-1 cursor-default"
            onMouseEnter={() => setHovered(index)}
            onFocus={() => setHovered(index)}
            onMouseLeave={() => setHovered(null)}
            onBlur={() => setHovered(null)}
            aria-label={`${point.label}: ${formatValue(point.value)}`}
            tabIndex={-1}
          />
        ))}
      </div>

      {active && activePoint ? (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-lg"
          style={{
            left: `${Math.min(Math.max((activePoint.x / WIDTH) * 100, 10), 90)}%`,
            top: `${Math.max((activePoint.y / HEIGHT) * 100 - 22, 0)}%`,
          }}
        >
          <p className="font-semibold text-popover-foreground">{active.label}</p>
          <p className="numeric mt-0.5 font-bold" style={{ color }}>
            {formatValue(active.value)}
          </p>
        </div>
      ) : null}
    </div>
  );
}
