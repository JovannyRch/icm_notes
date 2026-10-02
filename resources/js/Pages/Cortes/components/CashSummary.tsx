import { formatCurrency } from "@/helpers/formatters";
import { useCan } from "@/hooks/useCan";
import { ReactNode } from "react";

interface Props {
    total: number;
    notesCount: number;
    balanceSum: number;
    /** Efectivo en caja: ya trae restados gastos y devoluciones (calculateSums). */
    cashSum: number;
    cardSum: number;
    transferSum: number;
    expensesSum: number;
    returnsSum: number;
    previousNotesSum: number;
    purchasesSum: number;
    /** Ventas a crédito del día: lo que dejaron a cuenta y lo que resta. */
    credit?: { count: number; total: number; paid: number; balance: number };
    children?: ReactNode;
}

const Line = ({ label, value, hint, sign, strong = false }: { label: string; value: number; hint?: string; sign?: "−" | "+"; strong?: boolean }) => (
    <div className="flex items-baseline justify-between gap-3 py-1">
        <span className={strong ? "font-medium text-charcoal" : "text-steel"}>
            {label}
            {hint && <span className="block text-xs text-fog">{hint}</span>}
        </span>
        <span className={`tabular-nums ${strong ? "font-semibold text-charcoal" : "text-charcoal"}`}>
            {sign && value !== 0 ? `${sign} ` : ""}
            {formatCurrency(value)}
        </span>
    </div>
);

/**
 * Cuadre de caja del corte: presenta paso a paso las mismas sumas de calculateSums()
 * (no calcula nada distinto): cobrado hoy por método y cómo queda el efectivo.
 */
const CashSummary = ({ total, notesCount, balanceSum, cashSum, cardSum, transferSum, expensesSum, returnsSum, previousNotesSum, purchasesSum, credit, children }: Props) => {
    const seeCosts = useCan()("costs.view");
    const cashCollected = cashSum + expensesSum + returnsSum; // efectivo antes de gastos y devoluciones

    return (
        <section className="bg-white border border-ash rounded-card">
            <div className="p-4 border-b border-ash">
                <div className="text-xs font-medium tracking-wide uppercase text-fog">Venta del día</div>
                <div className="text-3xl font-semibold tracking-tight tabular-nums text-charcoal" data-testid="corte-sale">
                    {formatCurrency(total)}
                </div>
                <div className="mt-0.5 text-sm text-steel">
                    {notesCount} {notesCount === 1 ? "nota" : "notas"}
                    {balanceSum > 0.009 && (
                        <>
                            {" · "}
                            <span className="text-amber-700">por cobrar {formatCurrency(balanceSum)}</span>
                        </>
                    )}
                </div>
            </div>

            {credit && credit.count > 0 && (
                <div className="p-4 text-sm border-b border-ash bg-amber-tint/60" data-testid="corte-credit">
                    <div className="mb-1 text-xs font-medium tracking-wide uppercase text-amber-900">
                        A crédito · {credit.count} {credit.count === 1 ? "venta" : "ventas"}
                    </div>
                    <Line label="Vendido a crédito" value={credit.total} />
                    <Line label="Dejaron a cuenta" value={credit.paid} />
                    <div className="flex items-baseline justify-between gap-3 py-1">
                        <span className="font-medium text-amber-900">Resta por cobrar</span>
                        <span className="font-semibold tabular-nums text-amber-900">{formatCurrency(credit.balance)}</span>
                    </div>
                </div>
            )}

            <div className="p-4 text-sm border-b border-ash">
                <div className="mb-1 text-xs font-medium tracking-wide uppercase text-fog">Cobrado hoy</div>
                <Line label="Efectivo" value={cashCollected} />
                <Line label="Tarjeta" value={cardSum} />
                <Line label="Transferencia" value={transferSum} />
                {previousNotesSum > 0 && (
                    <p className="mt-1 text-xs text-fog">Incluye {formatCurrency(previousNotesSum)} de notas de días anteriores.</p>
                )}
            </div>

            <div className="p-4 text-sm">
                <div className="mb-1 text-xs font-medium tracking-wide uppercase text-fog">Efectivo en caja</div>
                <Line label="Efectivo cobrado" value={cashCollected} />
                <Line label="Gastos" value={expensesSum} sign="−" />
                <Line label="Devoluciones" value={returnsSum} sign="−" />
                <div className="flex items-baseline justify-between pt-2 mt-1 border-t border-ash">
                    <span className="font-medium text-charcoal">Debe haber en caja</span>
                    <span className={`text-2xl font-semibold tabular-nums ${cashSum < 0 ? "text-[#d03b3b]" : "text-charcoal"}`} data-testid="corte-cash">
                        {formatCurrency(cashSum)}
                    </span>
                </div>
                {seeCosts && (
                    <div className="pt-3 mt-3 border-t border-ash">
                        <Line label="Total de compra a pisos Leo" value={purchasesSum} />
                    </div>
                )}
            </div>

            {children && <div className="p-4 border-t border-ash">{children}</div>}
        </section>
    );
};

export default CashSummary;
