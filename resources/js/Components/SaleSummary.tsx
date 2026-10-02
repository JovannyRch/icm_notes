import { formatCurrency } from "@/helpers/formatters";
import { ReactNode } from "react";

export interface SummaryLine {
    quantity: number;
    description: string;
    mc: string | null;
    price: number;
    discount: number;
    amount: number;
    /** Subtotal de compra: sólo para quien ve costos (el dueño). */
    purchase?: number | null;
}

export interface SummaryPayment {
    date: string;
    cash: number;
    card: number;
    transfer: number;
}

export interface SummarySale {
    folio: string;
    customer: string | null;
    customer_phone: string | null;
    customer_address: string | null;
    sale_total: number;
    discount: number;
    flete: number;
    cash: number;
    cash_received: number | null;
    balance: number;
    canceled: boolean;
    lines: SummaryLine[];
    payments: SummaryPayment[];
}

const qty = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2));

const methodNames = (p: SummaryPayment) =>
    [p.cash > 0 && "Efectivo", p.card > 0 && "Tarjeta", p.transfer > 0 && "Transf."].filter(Boolean).join(" · ") || "—";

const Row = ({ label, value, strong, tone }: { label: string; value: string; strong?: boolean; tone?: "amber" }) => (
    <div className={`flex justify-between gap-3 py-0.5 ${strong ? "font-semibold text-charcoal" : "text-steel"} ${tone === "amber" ? "!text-amber-800 font-semibold" : ""}`}>
        <span>{label}</span>
        <span className="tabular-nums">{value}</span>
    </div>
);

const m2PerBox = (l: SummaryLine) => {
    const mc = Number(String(l.mc ?? "").replace(",", "."));
    return l.mc && mc > 0 ? mc : null;
};

/**
 * Resumen de una venta dentro de una lista (Ventas del día, Notas): partidas, totales,
 * pagos y cliente, lo mismo que el ticket, sin abrir otra pantalla. `today` sirve para
 * escribir "Hoy" en los pagos de ese día; `extra` agrega datos al final (p. ej. entrega).
 */
const SaleSummary = ({ sale, today, showPurchase = false, extra }: { sale: SummarySale; today: string; showPurchase?: boolean; extra?: ReactNode }) => {
    const gross = sale.lines.reduce((acc, l) => acc + l.price * l.quantity, 0);
    const discounts = sale.lines.reduce((acc, l) => acc + l.discount, 0) + sale.discount;
    const change = sale.cash_received !== null ? sale.cash_received - sale.cash : null;
    const purchase = sale.lines.reduce((acc, l) => acc + Number(l.purchase ?? 0), 0);

    return (
        <div className="grid gap-4 p-4 text-sm lg:grid-cols-[minmax(0,1fr)_300px]" data-testid={`detalle-${sale.folio}`}>
            <table className="w-full">
                <thead className="text-xs text-left text-fog">
                    <tr>
                        <th className="pb-1 pr-3 font-medium">Cant.</th>
                        <th className="pb-1 pr-3 font-medium">Producto</th>
                        <th className="pb-1 pr-3 font-medium text-right">Precio</th>
                        <th className="pb-1 font-medium text-right">Importe</th>
                        {showPurchase && <th className="pb-1 pl-3 font-medium text-right">Compra</th>}
                    </tr>
                </thead>
                <tbody className="tabular-nums">
                    {sale.lines.length === 0 && (
                        <tr>
                            <td colSpan={showPurchase ? 5 : 4} className="py-2 text-steel">
                                Sin productos
                            </td>
                        </tr>
                    )}
                    {sale.lines.map((l, i) => {
                        const mc = m2PerBox(l);
                        return (
                            <tr key={i} className="border-t border-ash/70">
                                <td className="py-1.5 pr-3 align-top whitespace-nowrap text-charcoal">{qty(l.quantity)}</td>
                                <td className="py-1.5 pr-3 align-top text-charcoal">
                                    {l.description}
                                    {mc && (
                                        <span className="block text-xs text-fog">
                                            {qty(mc)} m²/caja · {qty(Math.round(mc * l.quantity * 100) / 100)} m²
                                        </span>
                                    )}
                                </td>
                                <td className="py-1.5 pr-3 text-right align-top text-steel whitespace-nowrap">
                                    {formatCurrency(l.price)}
                                    {l.discount > 0 && <span className="block text-xs text-fog">desc. {formatCurrency(l.discount)}</span>}
                                </td>
                                <td className="py-1.5 text-right align-top font-medium text-charcoal whitespace-nowrap">{formatCurrency(l.amount)}</td>
                                {showPurchase && (
                                    <td className="py-1.5 pl-3 text-right align-top text-steel whitespace-nowrap">
                                        {l.purchase ? formatCurrency(l.purchase) : "—"}
                                    </td>
                                )}
                            </tr>
                        );
                    })}
                </tbody>
            </table>

            <div className="space-y-3">
                <div>
                    {(discounts > 0 || sale.flete > 0) && <Row label="Subtotal" value={formatCurrency(gross)} />}
                    {discounts > 0 && <Row label="Descuento" value={`-${formatCurrency(discounts)}`} />}
                    {sale.flete > 0 && <Row label="Flete" value={formatCurrency(sale.flete)} />}
                    <Row label="Total" value={formatCurrency(sale.sale_total)} strong />
                    {showPurchase && purchase > 0 && (
                        <>
                            <Row label="Compra" value={formatCurrency(purchase)} />
                            <Row label="Ganancia" value={formatCurrency(sale.sale_total - purchase)} />
                        </>
                    )}
                </div>

                {!sale.canceled && (
                    <div className="pt-2 border-t border-ash">
                        <div className="mb-0.5 text-xs font-medium tracking-wide uppercase text-fog">Pagos</div>
                        {sale.payments.length === 0 && <div className="text-steel">Sin pagos todavía</div>}
                        {sale.payments.map((p, i) => (
                            <Row
                                key={i}
                                label={`${p.date === today ? "Hoy" : p.date.split("-").reverse().join("/")} · ${methodNames(p)}`}
                                value={formatCurrency(p.cash + p.card + p.transfer)}
                            />
                        ))}
                        {change !== null && change > 0.009 && (
                            <>
                                <Row label="Recibió" value={formatCurrency(sale.cash_received!)} />
                                <Row label="Cambio" value={formatCurrency(change)} />
                            </>
                        )}
                        {sale.balance > 0.009 && <Row label="Resta" value={formatCurrency(sale.balance)} tone="amber" />}
                    </div>
                )}

                {(sale.customer_phone || sale.customer_address) && (
                    <div className="pt-2 text-xs border-t border-ash text-steel">
                        <div className="mb-0.5 font-medium tracking-wide uppercase text-fog">Cliente</div>
                        <div className="text-sm text-charcoal">{sale.customer}</div>
                        {sale.customer_phone && <div>Tel. {sale.customer_phone}</div>}
                        {sale.customer_address && <div className="whitespace-pre-line">{sale.customer_address}</div>}
                    </div>
                )}

                {extra && <div className="pt-2 text-xs border-t border-ash text-steel">{extra}</div>}
            </div>
        </div>
    );
};

export default SaleSummary;
