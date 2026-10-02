import { useCan } from "@/hooks/useCan";
import { formatCurrency } from "@/helpers/formatters";
import { ReactNode } from "react";

interface Props {
    total: number;
    cashSum: number;
    transferSum: number;
    cardSum: number;
    balanceSum: number;
    expensesSum: number;
    previousNotesTotal: number;
    returnsSum: number;
    purchasesSum: number;
}

const Tile = ({ label, value, hint, emphasis = false }: { label: string; value: number; hint?: ReactNode; emphasis?: boolean }) => (
    <div role="group" aria-label={label} className={`p-4 border rounded-card ${emphasis ? "bg-blue-50 border-blue-200" : "bg-white border-ash"}`}>
        <div className="text-xs font-medium tracking-wide text-fog uppercase">{label}</div>
        <div
            className={`mt-1 font-semibold whitespace-nowrap tabular-nums ${emphasis ? "text-2xl" : "text-xl"} ${
                value < 0 ? "text-[#d03b3b]" : emphasis ? "text-blue-900" : "text-charcoal"
            }`}
        >
            {formatCurrency(value)}
        </div>
        {hint && <div className="mt-1 text-xs text-fog">{hint}</div>}
    </div>
);

/** Totales del corte: sólo presentación, los importes vienen de calculateSums(). */
const CorteSummary = ({ total, cashSum, transferSum, cardSum, balanceSum, expensesSum, previousNotesTotal, returnsSum, purchasesSum }: Props) => {
    const seeCosts = useCan()("costs.view");
    return (
    <div className="space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Tile label="Venta total" value={total} emphasis hint="Notas del día, sin canceladas" />
            <Tile label="Efectivo" value={cashSum} hint="Ya descuenta gastos y devoluciones" />
            <Tile label="Transferencia" value={transferSum} />
            <Tile label="Tarjeta" value={cardSum} />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <Tile label="Entradas" value={previousNotesTotal} hint="Pagos de notas anteriores" />
            <Tile label="Restan notas" value={balanceSum} hint="Saldo pendiente de las notas" />
            <Tile label="Gastos" value={expensesSum} />
            <Tile label="Devoluciones" value={returnsSum} />
            {seeCosts && <Tile label="Total de compra a pisos Leo" value={purchasesSum} />}
        </div>
    </div>
    );
};

export default CorteSummary;
