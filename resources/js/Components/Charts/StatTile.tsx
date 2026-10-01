import { ReactNode } from "react";

interface Props {
    label: string;
    value: ReactNode;
    /** Variación % vs periodo anterior; null = sin comparación. */
    change?: number | null;
    /** true si subir es malo (p. ej. costos). */
    invert?: boolean;
    hint?: ReactNode;
}

const StatTile = ({ label, value, change, invert = false, hint }: Props) => {
    const hasChange = change !== undefined && change !== null && isFinite(change);
    const good = hasChange && (invert ? change! < 0 : change! > 0);
    const flat = hasChange && Math.abs(change!) < 0.05;

    return (
        <div className="p-4 bg-white border border-gray-200 rounded-lg">
            <div className="text-xs font-medium tracking-wide text-gray-500 uppercase">
                {label}
            </div>
            <div className="mt-1 text-2xl font-semibold text-gray-900 whitespace-nowrap">{value}</div>
            {hasChange && (
                <div
                    className={`mt-1 text-xs font-medium ${
                        flat ? "text-gray-500" : good ? "text-[#006300]" : "text-[#d03b3b]"
                    }`}
                >
                    {flat ? "▬" : change! > 0 ? "▲" : "▼"}{" "}
                    {Math.abs(change!).toFixed(1)}% vs periodo anterior
                </div>
            )}
            {!hasChange && change !== undefined && (
                <div className="mt-1 text-xs text-gray-400">Sin datos del periodo anterior</div>
            )}
            {hint && <div className="mt-1 text-xs text-gray-500">{hint}</div>}
        </div>
    );
};

export default StatTile;
