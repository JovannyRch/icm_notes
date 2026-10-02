import Container from "@/Components/Container";
import StatusPill from "@/Components/StatusPill";
import PageHeader from "@/Components/ui/PageHeader";
import { formatCurrency } from "@/helpers/formatters";
import { downloadTicketPdf, printTicket } from "@/helpers/printTicket";
import useAlerts from "@/hooks/useAlerts";
import { PageProps } from "@/types";
import { router } from "@inertiajs/react";
import { Button, SegmentedControl, Table } from "@radix-ui/themes";
import { confirmAlert } from "react-confirm-alert";
import { Fragment, MouseEvent, useState } from "react";
import { LuBan, LuChevronDown, LuChevronRight, LuFileDown, LuPrinter } from "react-icons/lu";

interface SaleLine {
    quantity: number;
    description: string;
    mc: string | null;
    price: number;
    discount: number;
    amount: number;
}

interface SalePayment {
    date: string;
    cash: number;
    card: number;
    transfer: number;
}

interface Sale {
    customer_address: string | null;
    flete: number;
    cash_received: number | null;
    lines: SaleLine[];
    payments: SalePayment[];
    id: number;
    folio: string;
    code: string | null;
    customer: string;
    customer_phone: string | null;
    balance: number;
    /** Venta a crédito: le queda saldo. */
    credit: boolean;
    time: string | null;
    items_count: number;
    sale_total: number;
    discount: number;
    cash: number;
    card: number;
    transfer: number;
    seller: string | null;
    canceled: boolean;
    can_cancel: boolean;
}

interface Props extends PageProps {
    branch: { id: number; name: string } | null;
    date: string;
    allBranch: boolean;
    onlyMine: boolean;
    sales: Sale[];
}

const formatDay = (date: string) => {
    const text = new Intl.DateTimeFormat("es-MX", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));
    return text.charAt(0).toUpperCase() + text.slice(1); // "Jueves, 1 de octubre"
};

const methods = (s: { cash: number; card: number; transfer: number }) =>
    [s.cash > 0 && `Efectivo ${formatCurrency(s.cash)}`, s.card > 0 && `Tarjeta ${formatCurrency(s.card)}`, s.transfer > 0 && `Transf. ${formatCurrency(s.transfer)}`]
        .filter(Boolean)
        .join(" · ");

const qty = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2));

const Row = ({ label, value, strong, tone }: { label: string; value: string; strong?: boolean; tone?: "amber" }) => (
    <div className={`flex justify-between gap-3 py-0.5 ${strong ? "font-semibold text-charcoal" : "text-steel"} ${tone === "amber" ? "!text-amber-800 font-semibold" : ""}`}>
        <span>{label}</span>
        <span className="tabular-nums">{value}</span>
    </div>
);

/** Resumen de la venta dentro de la lista: lo mismo que el ticket, sin abrir otra pantalla. */
const SaleDetail = ({ sale, date }: { sale: Sale; date: string }) => {
    const gross = sale.lines.reduce((acc, l) => acc + l.price * l.quantity, 0);
    const lineDiscounts = sale.lines.reduce((acc, l) => acc + l.discount, 0);
    const change = sale.cash_received !== null ? sale.cash_received - sale.cash : null;
    const m2 = (l: SaleLine) => {
        const mc = Number(String(l.mc ?? "").replace(",", "."));
        return l.mc && mc > 0 ? mc : null;
    };

    return (
        <div className="grid gap-4 p-4 text-sm lg:grid-cols-[minmax(0,1fr)_300px]" data-testid={`detalle-${sale.folio}`}>
            <table className="w-full">
                <thead className="text-xs text-left text-fog">
                    <tr>
                        <th className="pb-1 pr-3 font-medium">Cant.</th>
                        <th className="pb-1 pr-3 font-medium">Producto</th>
                        <th className="pb-1 pr-3 font-medium text-right">Precio</th>
                        <th className="pb-1 font-medium text-right">Importe</th>
                    </tr>
                </thead>
                <tbody className="tabular-nums">
                    {sale.lines.map((l, i) => (
                        <tr key={i} className="border-t border-ash/70">
                            <td className="py-1.5 pr-3 align-top whitespace-nowrap text-charcoal">{qty(l.quantity)}</td>
                            <td className="py-1.5 pr-3 align-top text-charcoal">
                                {l.description}
                                {m2(l) && (
                                    <span className="block text-xs text-fog">
                                        {qty(m2(l)!)} m²/caja · {qty(Math.round(m2(l)! * l.quantity * 100) / 100)} m²
                                    </span>
                                )}
                            </td>
                            <td className="py-1.5 pr-3 text-right align-top text-steel whitespace-nowrap">
                                {formatCurrency(l.price)}
                                {l.discount > 0 && <span className="block text-xs text-fog">desc. {formatCurrency(l.discount)}</span>}
                            </td>
                            <td className="py-1.5 text-right align-top font-medium text-charcoal whitespace-nowrap">{formatCurrency(l.amount)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <div className="space-y-3">
                <div>
                    {(lineDiscounts + sale.discount > 0 || sale.flete > 0) && <Row label="Subtotal" value={formatCurrency(gross)} />}
                    {lineDiscounts + sale.discount > 0 && <Row label="Descuento" value={`-${formatCurrency(lineDiscounts + sale.discount)}`} />}
                    {sale.flete > 0 && <Row label="Flete" value={formatCurrency(sale.flete)} />}
                    <Row label="Total" value={formatCurrency(sale.sale_total)} strong />
                </div>

                {!sale.canceled && (
                    <div className="pt-2 border-t border-ash">
                        <div className="mb-0.5 text-xs font-medium tracking-wide uppercase text-fog">Pagos</div>
                        {sale.payments.length === 0 && <div className="text-steel">Sin pagos todavía</div>}
                        {sale.payments.map((p, i) => (
                            <Row
                                key={i}
                                label={`${p.date === date ? "Hoy" : p.date.split("-").reverse().join("/")} · ${methods(p) ? methods(p).replace(/ \$[\d,.]+/g, "") : "—"}`}
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
            </div>
        </div>
    );
};

const Tile = ({ label, value, hint, tone, testId }: { label: string; value: number; hint?: string; tone?: "amber"; testId?: string }) => (
    <div className={`p-3 border rounded-card ${tone === "amber" ? "bg-amber-tint border-transparent" : "bg-white border-ash"}`} data-testid={testId}>
        <div className={`text-xs font-medium ${tone === "amber" ? "text-amber-900" : "text-steel"}`}>{label}</div>
        <div className={`mt-1 text-xl font-semibold tabular-nums ${tone === "amber" ? "text-amber-900" : "text-charcoal"}`}>{formatCurrency(value)}</div>
        {hint && <div className={`text-xs ${tone === "amber" ? "text-amber-900/80" : "text-fog"}`}>{hint}</div>}
    </div>
);

const SalesIndex = ({ branch, date, allBranch, onlyMine, sales, flash }: Props) => {
    useAlerts(flash);

    const [open, setOpen] = useState<Set<number>>(new Set());
    const toggle = (id: number) =>
        setOpen((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    const allOpen = sales.length > 0 && sales.every((s) => open.has(s.id));
    const columns = onlyMine ? 6 : 7;

    const active = sales.filter((s) => !s.canceled);

    // Pago de la venta: cancelada, a crédito (a cuenta y resta) o métodos de pago.
    const payment = (s: Sale) => (
        <>
            {s.canceled ? (
                <StatusPill tone="gray">Cancelada</StatusPill>
            ) : s.credit ? (
                // A crédito: lo que dejó a cuenta (y con qué) y lo que resta.
                <div className="space-y-0.5">
                    <StatusPill tone="amber">A crédito</StatusPill>
                    <div>
                        A cuenta: <b className="font-medium tabular-nums text-charcoal">{formatCurrency(paid(s))}</b>
                        {paid(s) > 0 && <span className="text-fog"> ({methods(s)})</span>}
                    </div>
                    <div className="font-semibold text-amber-800">
                        Resta: <span className="tabular-nums">{formatCurrency(s.balance)}</span>
                    </div>
                </div>
            ) : (
                methods(s) || "—"
            )}
        </>
    );

    const actions = (s: Sale) => (
        <div className="inline-flex gap-1.5">
            <Button size="1" variant="soft" color="gray" onClick={() => printTicket(route("tickets.show", { note: s.id, print: 1 }))}>
                <LuPrinter />
                Reimprimir
            </Button>
            <Button size="1" variant="soft" color="gray" onClick={() => downloadTicketPdf(s.id)} aria-label={`PDF del ticket ${s.folio}`}>
                <LuFileDown />
                PDF
            </Button>
            {s.can_cancel && (
                <Button size="1" variant="soft" color="red" onClick={() => cancel(s)}>
                    <LuBan />
                    Cancelar
                </Button>
            )}
        </div>
    );

    const sum = (key: "sale_total" | "cash" | "card" | "transfer" | "balance", list = active) => list.reduce((acc, s) => acc + s[key], 0);
    const paid = (s: Sale) => s.cash + s.card + s.transfer;
    // Ventas a crédito: lo que dejaron a cuenta y lo que resta por cobrar.
    const credit = active.filter((s) => s.credit);
    const creditPaid = credit.reduce((acc, s) => acc + paid(s), 0);

    const cancel = (sale: Sale) =>
        confirmAlert({
            title: `Cancelar venta ${sale.folio}`,
            message: `Se cancela la venta de ${formatCurrency(sale.sale_total)}, se quita su pago y las piezas regresan al inventario. No se puede deshacer.`,
            buttons: [
                { label: "Cancelar venta", onClick: () => router.post(route("caja.cancel", sale.id), {}, { preserveScroll: true }) },
                { label: "No" },
            ],
        });

    return (
        <Container headTitle="Mis ventas">
            <PageHeader
                back={{ label: "Caja", href: route("caja") }}
                eyebrow={branch?.name}
                title={onlyMine ? "Mis ventas del día" : "Ventas del día"}
                description={onlyMine ? formatDay(date) : `${formatDay(date)} · todos los cajeros de la sucursal`}
                actions={
                    allBranch && (
                        <SegmentedControl.Root
                            value={onlyMine ? "mine" : "all"}
                            onValueChange={(v) => router.get(route("caja.sales"), v === "mine" ? { mias: 1 } : {}, { preserveScroll: true })}
                        >
                            <SegmentedControl.Item value="all">Toda la sucursal</SegmentedControl.Item>
                            <SegmentedControl.Item value="mine">Solo mías</SegmentedControl.Item>
                        </SegmentedControl.Root>
                    )
                }
            />

            {/* Totales del día: lo vendido = lo cobrado + lo que queda por cobrar (ventas a crédito). */}
            <div className="grid grid-cols-2 gap-3 mb-4 sm:grid-cols-3 lg:grid-cols-6">
                <Tile label="Vendido" value={sum("sale_total")} hint={`${active.length} ${active.length === 1 ? "venta" : "ventas"}`} />
                <Tile
                    label="Cobrado"
                    value={sum("cash") + sum("card") + sum("transfer")}
                    hint={creditPaid > 0 ? `incluye ${formatCurrency(creditPaid)} a cuenta` : "efectivo, tarjeta y transferencia"}
                    testId="ventas-cobrado"
                />
                <Tile
                    label="Por cobrar"
                    value={sum("balance", credit)}
                    hint={credit.length > 0 ? `${credit.length} ${credit.length === 1 ? "venta" : "ventas"} a crédito` : "sin ventas a crédito"}
                    tone={credit.length > 0 ? "amber" : undefined}
                    testId="ventas-credito"
                />
                <Tile label="Efectivo" value={sum("cash")} />
                <Tile label="Tarjeta" value={sum("card")} />
                <Tile label="Transferencia" value={sum("transfer")} />
            </div>

            {sales.length > 0 && (
                <div className="flex items-center justify-between gap-2 mb-2">
                    <p className="text-xs text-fog">Toca una venta para ver sus productos y pagos.</p>
                    <Button size="1" variant="ghost" color="gray" onClick={() => setOpen(allOpen ? new Set() : new Set(sales.map((s) => s.id)))}>
                        {allOpen ? "Ocultar detalle" : "Ver detalle de todas"}
                    </Button>
                </div>
            )}

            {/* Escritorio: tabla */}
            <div className="hidden overflow-x-auto border md:block border-ash rounded-card">
                <Table.Root>
                    <Table.Header>
                        <Table.Row>
                            <Table.ColumnHeaderCell>Hora</Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell>Folio</Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell>Cliente</Table.ColumnHeaderCell>
                            {!onlyMine && <Table.ColumnHeaderCell>Vendió</Table.ColumnHeaderCell>}
                            <Table.ColumnHeaderCell>Pago</Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell justify="end">Total</Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell />
                        </Table.Row>
                    </Table.Header>
                    <Table.Body>
                        {sales.map((s) => (
                            <Fragment key={s.id}>
                            <Table.Row
                                align="center"
                                className={`cursor-pointer hover:bg-paper/60 ${s.canceled ? "opacity-60" : ""} ${open.has(s.id) ? "bg-paper/60" : ""}`}
                                onClick={(e: MouseEvent<HTMLTableRowElement>) => {
                                    // Los botones de la fila (reimprimir, PDF, cancelar) no despliegan.
                                    if (!e.currentTarget.contains(e.target as Node) || (e.target as HTMLElement).closest("button:not([data-expand])")) return;
                                    toggle(s.id);
                                }}
                            >
                                <Table.Cell className="tabular-nums text-steel whitespace-nowrap">
                                    <button
                                        type="button"
                                        data-expand
                                        aria-expanded={open.has(s.id)}
                                        aria-label={`Detalle de la venta ${s.folio}`}
                                        className="inline-flex items-center justify-center w-5 h-5 mr-1 align-middle rounded text-fog hover:text-charcoal"
                                    >
                                        {open.has(s.id) ? <LuChevronDown /> : <LuChevronRight />}
                                    </button>
                                    {s.time}
                                </Table.Cell>
                                <Table.Cell className="font-medium tabular-nums text-charcoal">{s.folio}</Table.Cell>
                                <Table.Cell>
                                    {s.customer}
                                    {s.customer_phone && <span className="ml-1 text-xs text-fog">· Tel. {s.customer_phone}</span>}
                                    <div className="text-xs text-fog">
                                        {s.items_count} {s.items_count === 1 ? "producto" : "productos"}
                                        {s.discount > 0 && ` · desc. ${formatCurrency(s.discount)}`}
                                    </div>
                                </Table.Cell>
                                {!onlyMine && <Table.Cell className="text-steel">{s.seller ?? "—"}</Table.Cell>}
                                <Table.Cell className="text-xs text-steel">{payment(s)}</Table.Cell>
                                <Table.Cell justify="end" className={`font-semibold tabular-nums ${s.canceled ? "line-through text-fog" : "text-charcoal"}`}>
                                    {formatCurrency(s.sale_total)}
                                </Table.Cell>
                                <Table.Cell justify="end">
                                    {actions(s)}
                                </Table.Cell>
                            </Table.Row>
                            {open.has(s.id) && (
                                <Table.Row className="bg-paper/40">
                                    <Table.Cell colSpan={columns} className="!p-0">
                                        <SaleDetail sale={s} date={date} />
                                    </Table.Cell>
                                </Table.Row>
                            )}
                            </Fragment>
                        ))}
                    </Table.Body>
                </Table.Root>
            </div>

            {/* Celular: tarjetas con el detalle adentro */}
            <ul className="space-y-2 md:hidden">
                {sales.map((s) => (
                    <li key={s.id} className={`bg-white border border-ash rounded-card ${s.canceled ? "opacity-60" : ""}`}>
                        <button
                            type="button"
                            aria-expanded={open.has(s.id)}
                            aria-label={`Detalle de la venta ${s.folio}`}
                            onClick={() => toggle(s.id)}
                            className="w-full p-3 text-left"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <div className="font-medium text-charcoal">
                                        Folio {s.folio} <span className="font-normal text-fog">· {s.time}</span>
                                    </div>
                                    <div className="text-sm truncate text-steel">{s.customer}</div>
                                    <div className="text-xs text-fog">
                                        {s.items_count} {s.items_count === 1 ? "producto" : "productos"}
                                        {!onlyMine && s.seller ? ` · ${s.seller}` : ""}
                                    </div>
                                </div>
                                <div className="flex items-start gap-1 shrink-0">
                                    <div className={`font-semibold tabular-nums ${s.canceled ? "line-through text-fog" : "text-charcoal"}`}>{formatCurrency(s.sale_total)}</div>
                                    {open.has(s.id) ? <LuChevronDown className="mt-1 text-fog" /> : <LuChevronRight className="mt-1 text-fog" />}
                                </div>
                            </div>
                            <div className="mt-2 text-xs text-steel">{payment(s)}</div>
                        </button>
                        {open.has(s.id) && (
                            <div className="border-t border-ash bg-paper/40">
                                <SaleDetail sale={s} date={date} />
                            </div>
                        )}
                        <div className="px-3 pb-3">{actions(s)}</div>
                    </li>
                ))}
            </ul>

            {sales.length === 0 && (
                <div className="py-14 text-center border md:border-t-0 md:rounded-t-none border-ash rounded-card">
                    <p className="font-medium text-charcoal">Todavía no hay ventas hoy</p>
                    <p className="mt-1 text-sm text-fog">Las ventas cobradas en caja aparecen aquí.</p>
                </div>
            )}
        </Container>
    );
};

export default SalesIndex;
