import { ReactNode } from "react";

export interface BarListItem {
    key: string | number;
    label: ReactNode;
    value: number;
    display: ReactNode;
    detail?: ReactNode;
    color?: string;
}

/** Barras horizontales en HTML: etiqueta, barra proporcional y valor; legible en móvil. */
const BarList = ({
    items,
    color = "#2a78d6",
}: {
    items: BarListItem[];
    color?: string;
}) => {
    const max = Math.max(...items.map((i) => i.value), 0);

    return (
        <ul className="space-y-3">
            {items.map((item) => (
                <li key={item.key} title={typeof item.label === "string" ? item.label : undefined}>
                    <div className="flex items-baseline justify-between gap-3 mb-1 text-sm">
                        <span className="text-graphite truncate">{item.label}</span>
                        <span className="font-medium text-charcoal tabular-nums whitespace-nowrap">
                            {item.display}
                        </span>
                    </div>
                    <div className="h-2 overflow-hidden bg-paper rounded">
                        <div
                            className="h-full rounded"
                            style={{
                                width: max > 0 ? `${(item.value / max) * 100}%` : 0,
                                minWidth: item.value > 0 ? 4 : 0,
                                background: item.color ?? color,
                            }}
                        />
                    </div>
                    {item.detail && (
                        <div className="mt-1 text-xs text-fog">{item.detail}</div>
                    )}
                </li>
            ))}
        </ul>
    );
};

export default BarList;
