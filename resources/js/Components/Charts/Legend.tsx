import { ColumnSeries } from "./ColumnChart";

const Legend = ({ series }: { series: ColumnSeries[] }) => (
    <div className="flex flex-wrap gap-4 text-xs text-gray-600">
        {series.map((s) => (
            <span key={s.key} className="flex items-center gap-1.5">
                <span
                    className="inline-block w-3 h-3 rounded-sm"
                    style={{ background: s.color }}
                />
                {s.label}
            </span>
        ))}
    </div>
);

export default Legend;
