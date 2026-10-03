import Container from "@/Components/Container";
import PageHeader from "@/Components/ui/PageHeader";
import { formatCurrency, formatDate } from "@/helpers/formatters";
import useAlerts from "@/hooks/useAlerts";
import { PageProps } from "@/types";
import { router } from "@inertiajs/react";
import { Button } from "@radix-ui/themes";
import { LuCheck, LuPackagePlus, LuPrinter, LuUndo2 } from "react-icons/lu";
import { EntryStatusBadge, StockEntry } from "./Index";

const qty = (n: number) => (Number.isInteger(Number(n)) ? String(Number(n)) : Number(n).toFixed(2));
const pct = (n: number) => `${qty(n)}%`;

/** Detalle de una nota de entrada: partidas con costo, IVA y extra, y el total a pagar al proveedor. */
const StockEntryShow = ({ entry, flash }: PageProps<{ entry: StockEntry }>) => {
    useAlerts(flash);

    const base = entry.items.reduce((a, i) => a + i.cost * i.quantity, 0);
    const iva = entry.items.reduce((a, i) => a + i.cost * i.quantity * (i.iva / 100), 0);
    const extra = entry.total - base - iva;
    const pieces = entry.items.reduce((a, i) => a + Number(i.quantity), 0);

    const setStatus = (status: StockEntry["status"]) =>
        router.patch(route("stock-entries.status", entry.id), { status }, { preserveScroll: true });

    return (
        <Container headTitle={`Nota de entrada #${entry.id}`}>
            <PageHeader
                back={{ label: "Notas de entrada", href: route("stock-entries.index") }}
                eyebrow={entry.branch?.name}
                title={
                    <span className="inline-flex flex-wrap items-center gap-2">
                        Nota de entrada #{entry.id} <EntryStatusBadge status={entry.status} />
                    </span>
                }
                description={[formatDate(entry.date), entry.supplier ?? "Sin proveedor", entry.reference].filter(Boolean).join(" · ")}
                actions={
                    <>
                        <Button variant="outline" color="gray" onClick={() => window.print()} className="print:hidden">
                            <LuPrinter /> Imprimir
                        </Button>
                        {entry.status === "pending" ? (
                            <Button color="green" onClick={() => setStatus("paid")} className="print:hidden">
                                <LuCheck /> Marcar pagada al proveedor
                            </Button>
                        ) : (
                            <Button variant="outline" color="gray" onClick={() => setStatus("pending")} className="print:hidden">
                                <LuUndo2 /> Regresar a por pagar
                            </Button>
                        )}
                        <Button variant="outline" color="gray" onClick={() => router.visit(route("stock-entries.create"))} className="print:hidden">
                            <LuPackagePlus /> Nueva
                        </Button>
                    </>
                }
            />

            <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
                <section className="overflow-x-auto bg-white border border-ash rounded-card">
                    <table className="w-full text-sm min-w-[680px]">
                        <thead>
                            <tr className="text-xs text-left border-b text-fog border-ash">
                                <th className="px-4 py-2 font-medium">Producto</th>
                                <th className="px-2 py-2 font-medium text-right">Cantidad</th>
                                <th className="px-2 py-2 font-medium text-right">Costo</th>
                                <th className="px-2 py-2 font-medium text-right">IVA</th>
                                <th className="px-2 py-2 font-medium text-right">Extra</th>
                                <th className="px-2 py-2 font-medium text-right">Costo real</th>
                                <th className="px-4 py-2 font-medium text-right">Importe</th>
                            </tr>
                        </thead>
                        <tbody className="tabular-nums">
                            {entry.items.map((i) => (
                                <tr key={i.id} className="border-b border-ash/70 last:border-0">
                                    <td className="px-4 py-2.5">
                                        <div className="font-medium text-charcoal">{[i.brand, i.model].filter(Boolean).join(" ")}</div>
                                        <div className="text-xs text-fog">{[i.measure, i.unit, i.mc ? `${i.mc} m²/caja` : null].filter(Boolean).join(" · ")}</div>
                                    </td>
                                    <td className="px-2 py-2.5 text-right text-charcoal">{qty(i.quantity)}</td>
                                    <td className="px-2 py-2.5 text-right text-steel">{formatCurrency(i.cost)}</td>
                                    <td className="px-2 py-2.5 text-right text-steel">{pct(i.iva)}</td>
                                    <td className="px-2 py-2.5 text-right text-steel">{pct(i.extra)}</td>
                                    <td className="px-2 py-2.5 text-right text-steel">{formatCurrency(i.quantity > 0 ? i.subtotal / i.quantity : 0)}</td>
                                    <td className="px-4 py-2.5 font-semibold text-right text-charcoal">{formatCurrency(i.subtotal)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </section>

                <aside className="space-y-4">
                    <section className="p-4 bg-white border border-ash rounded-card">
                        <dl className="space-y-1.5 text-sm">
                            <div className="flex justify-between">
                                <dt className="text-steel">Piezas</dt>
                                <dd className="tabular-nums text-charcoal">{qty(pieces)}</dd>
                            </div>
                            <div className="flex justify-between">
                                <dt className="text-steel">Costo sin IVA</dt>
                                <dd className="tabular-nums text-charcoal">{formatCurrency(base)}</dd>
                            </div>
                            <div className="flex justify-between">
                                <dt className="text-steel">IVA</dt>
                                <dd className="tabular-nums text-charcoal">{formatCurrency(iva)}</dd>
                            </div>
                            {extra > 0.004 && (
                                <div className="flex justify-between">
                                    <dt className="text-steel">Extra</dt>
                                    <dd className="tabular-nums text-charcoal">{formatCurrency(extra)}</dd>
                                </div>
                            )}
                        </dl>
                        <div className="pt-3 mt-3 border-t border-ash">
                            <div className="text-sm font-medium text-steel">Total a pagar al proveedor</div>
                            <div className="text-3xl font-semibold tracking-tight tabular-nums text-charcoal" data-testid="entry-total">
                                {formatCurrency(entry.total)}
                            </div>
                            <div className="mt-1">
                                <EntryStatusBadge status={entry.status} />
                            </div>
                        </div>
                    </section>

                    <section className="p-4 space-y-1 text-sm bg-white border border-ash rounded-card text-steel">
                        <div>
                            <span className="text-fog">Registró:</span> {entry.user?.name ?? "—"}
                        </div>
                        <div>
                            <span className="text-fog">Fecha de captura:</span> {new Date(entry.created_at).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" })}
                        </div>
                        {entry.notes && <div className="pt-2 whitespace-pre-line text-charcoal">{entry.notes}</div>}
                    </section>
                </aside>
            </div>
        </Container>
    );
};

export default StockEntryShow;
