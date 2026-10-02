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
import { LuBan, LuFileDown, LuPrinter } from "react-icons/lu";

interface Sale {
    id: number;
    folio: string;
    code: string | null;
    customer: string;
    customer_phone: string | null;
    balance: number;
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

const methods = (s: Sale) =>
    [s.cash > 0 && `Efectivo ${formatCurrency(s.cash)}`, s.card > 0 && `Tarjeta ${formatCurrency(s.card)}`, s.transfer > 0 && `Transf. ${formatCurrency(s.transfer)}`]
        .filter(Boolean)
        .join(" · ");

const SalesIndex = ({ branch, date, allBranch, onlyMine, sales, flash }: Props) => {
    useAlerts(flash);

    const active = sales.filter((s) => !s.canceled);
    const sum = (key: "sale_total" | "cash" | "card" | "transfer") => active.reduce((acc, s) => acc + s[key], 0);

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

            <div className="grid grid-cols-2 gap-3 mb-4 sm:grid-cols-4">
                {[
                    ["Vendido", sum("sale_total"), `${active.length} ${active.length === 1 ? "venta" : "ventas"}`],
                    ["Efectivo", sum("cash"), null],
                    ["Tarjeta", sum("card"), null],
                    ["Transferencia", sum("transfer"), null],
                ].map(([label, value, hint]) => (
                    <div key={label as string} className="p-3 bg-white border border-ash rounded-card">
                        <div className="text-xs font-medium text-steel">{label}</div>
                        <div className="mt-1 text-xl font-semibold tabular-nums text-charcoal">{formatCurrency(value as number)}</div>
                        {hint && <div className="text-xs text-fog">{hint}</div>}
                    </div>
                ))}
            </div>

            <div className="overflow-x-auto border border-ash rounded-card">
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
                            <Table.Row key={s.id} align="center" className={s.canceled ? "opacity-60" : ""}>
                                <Table.Cell className="tabular-nums text-steel">{s.time}</Table.Cell>
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
                                <Table.Cell className="text-xs text-steel">{s.canceled ? (
                                        <StatusPill tone="gray">Cancelada</StatusPill>
                                    ) : (
                                        <>
                                            {methods(s) || "Sin abono"}
                                            {s.balance > 0.009 && (
                                                <div className="mt-1">
                                                    <StatusPill tone="amber">Debe {formatCurrency(s.balance)}</StatusPill>
                                                </div>
                                            )}
                                        </>
                                    )}</Table.Cell>
                                <Table.Cell justify="end" className={`font-semibold tabular-nums ${s.canceled ? "line-through text-fog" : "text-charcoal"}`}>
                                    {formatCurrency(s.sale_total)}
                                </Table.Cell>
                                <Table.Cell justify="end">
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
                                </Table.Cell>
                            </Table.Row>
                        ))}
                    </Table.Body>
                </Table.Root>
                {sales.length === 0 && (
                    <div className="py-14 text-center">
                        <p className="font-medium text-charcoal">Todavía no hay ventas hoy</p>
                        <p className="mt-1 text-sm text-fog">Las ventas cobradas en caja aparecen aquí.</p>
                    </div>
                )}
            </div>
        </Container>
    );
};

export default SalesIndex;
