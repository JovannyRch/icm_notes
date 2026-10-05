import {
    CHART,
    formatBucket,
    formatBucketLong,
    formatCompactCurrency,
    niceScale,
} from "@/helpers/analytics";
import { formatCurrency } from "@/helpers/formatters";
import { ReactNode, useEffect, useRef, useState } from "react";

export interface ColumnSeries {
    key: string;
    label: string;
    color: string;
}

interface Props {
    data: ({ key: string } & Record<string, number | string>)[];
    /** Una serie = columnas simples; varias = columnas apiladas en ese orden (de abajo hacia arriba). */
    series: ColumnSeries[];
    height?: number;
    /** Filas extra en el tooltip (p. ej. costo y utilidad). */
    tooltipExtra?: (row: Props["data"][number]) => ReactNode;
    /** "count" para cantidades (ventas, tickets) en vez de pesos. */
    valueFormat?: "currency" | "count";
}

const PAD = { top: 12, right: 8, bottom: 28, left: 56 };
const GAP = 2; // separación de superficie entre segmentos apilados

/** Columnas (simples o apiladas) en SVG, con eje Y en moneda y tooltip por columna. */
const ColumnChart = ({ data, series, height = 240, tooltipExtra, valueFormat = "currency" }: Props) => {
    const axisText = (v: number) => (valueFormat === "count" ? new Intl.NumberFormat("es-MX", { maximumFractionDigits: 1 }).format(v) : formatCompactCurrency(v));
    const valueText = (v: number) => (valueFormat === "count" ? new Intl.NumberFormat("es-MX").format(v) : formatCurrency(v));
    const ref = useRef<HTMLDivElement>(null);
    const [width, setWidth] = useState(600);
    const [hover, setHover] = useState<number | null>(null);

    useEffect(() => {
        if (!ref.current) return;
        const observer = new ResizeObserver(([entry]) =>
            setWidth(entry.contentRect.width)
        );
        observer.observe(ref.current);
        return () => observer.disconnect();
    }, []);

    const totals = data.map((row) =>
        series.reduce((sum, s) => sum + Number(row[s.key] ?? 0), 0)
    );
    const ticks = niceScale(Math.max(...totals, 0));
    const max = ticks[ticks.length - 1];

    const innerW = Math.max(width - PAD.left - PAD.right, 10);
    const innerH = height - PAD.top - PAD.bottom;
    const band = innerW / Math.max(data.length, 1);
    const barW = Math.max(Math.min(band * 0.7, 32), 2);
    const y = (v: number) => PAD.top + innerH - (v / max) * innerH;
    const labelEvery = Math.ceil(data.length / Math.max(innerW / 56, 1));

    const hovered = hover !== null ? data[hover] : null;
    const tooltipLeft =
        hover !== null
            ? Math.min(
                  Math.max(PAD.left + band * hover + band / 2, 110),
                  width - 110
              )
            : 0;

    return (
        <div ref={ref} className="relative w-full select-none">
            <svg
                width={width}
                height={height}
                role="img"
                aria-label={`Gráfica de columnas: ${series.map((s) => s.label).join(", ")}`}
                onMouseLeave={() => setHover(null)}
            >
                {ticks.map((t) => (
                    <g key={t}>
                        <line
                            x1={PAD.left}
                            x2={width - PAD.right}
                            y1={y(t)}
                            y2={y(t)}
                            stroke={t === 0 ? CHART.axis : CHART.grid}
                            strokeWidth={1}
                        />
                        <text
                            x={PAD.left - 8}
                            y={y(t)}
                            dy="0.32em"
                            textAnchor="end"
                            fontSize={11}
                            fill={CHART.muted}
                            style={{ fontVariantNumeric: "tabular-nums" }}
                        >
                            {axisText(t)}
                        </text>
                    </g>
                ))}

                {data.map((row, i) => {
                    const x0 = PAD.left + band * i;
                    const cx = x0 + (band - barW) / 2;
                    let acc = 0;
                    const visible = series.filter(
                        (s) => Number(row[s.key] ?? 0) > 0
                    );

                    return (
                        <g key={row.key}>
                            {hover === i && (
                                <rect
                                    x={x0}
                                    y={PAD.top}
                                    width={band}
                                    height={innerH}
                                    fill="#000"
                                    opacity={0.04}
                                />
                            )}
                            {visible.map((s, si) => {
                                const value = Number(row[s.key]);
                                const top = y(acc + value);
                                const bottom = y(acc);
                                acc += value;
                                const isTop = si === visible.length - 1;
                                const h = Math.max(
                                    bottom - top - (si > 0 ? GAP : 0),
                                    1
                                );
                                const r = isTop ? Math.min(4, barW / 2, h) : 0;
                                const yTop = top;
                                // Sólo el extremo superior del apilado va redondeado.
                                const d = `M${cx},${yTop + h} V${yTop + r} Q${cx},${yTop} ${cx + r},${yTop} H${cx + barW - r} Q${cx + barW},${yTop} ${cx + barW},${yTop + r} V${yTop + h} Z`;
                                return (
                                    <path key={s.key} d={d} fill={s.color} />
                                );
                            })}
                            {i % labelEvery === 0 && (
                                <text
                                    x={x0 + band / 2}
                                    y={height - 8}
                                    textAnchor="middle"
                                    fontSize={11}
                                    fill={CHART.muted}
                                >
                                    {formatBucket(row.key)}
                                </text>
                            )}
                            {/* zona de hover más grande que la columna */}
                            <rect
                                x={x0}
                                y={PAD.top}
                                width={band}
                                height={innerH}
                                fill="transparent"
                                onMouseEnter={() => setHover(i)}
                            />
                        </g>
                    );
                })}
            </svg>

            {hovered && (
                <div
                    className="absolute z-10 px-3 py-2 text-xs -translate-x-1/2 bg-white border border-ash rounded-button shadow-popover pointer-events-none min-w-[180px]"
                    style={{ left: tooltipLeft, top: 0 }}
                >
                    <div className="mb-1 font-semibold text-charcoal">
                        {formatBucketLong(hovered.key)}
                    </div>
                    {series.map((s) => (
                        <div
                            key={s.key}
                            className="flex items-center justify-between gap-4 text-graphite"
                        >
                            <span className="flex items-center gap-1.5">
                                <span
                                    className="inline-block w-2.5 h-2.5 rounded-sm"
                                    style={{ background: s.color }}
                                />
                                {s.label}
                            </span>
                            <span className="font-medium tabular-nums">
                                {valueText(Number(hovered[s.key] ?? 0))}
                            </span>
                        </div>
                    ))}
                    {series.length > 1 && (
                        <div className="flex justify-between pt-1 mt-1 font-semibold text-charcoal border-t border-ash">
                            <span>Total</span>
                            <span className="tabular-nums">
                                {valueText(totals[hover!])}
                            </span>
                        </div>
                    )}
                    {tooltipExtra?.(hovered)}
                </div>
            )}
        </div>
    );
};

export default ColumnChart;
