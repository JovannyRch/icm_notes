import BarList from "@/Components/Charts/BarList";
import ColumnChart, { ColumnSeries } from "@/Components/Charts/ColumnChart";
import Legend from "@/Components/Charts/Legend";
import StatTile from "@/Components/Charts/StatTile";
import Container from "@/Components/Container";
import {
    ORDINAL_BLUE,
    SERIES,
    formatNumber,
    percentChange,
} from "@/helpers/analytics";
import { formatCurrency } from "@/helpers/formatters";
import { useBranch } from "@/hooks/useBranch";
import { PageProps } from "@/types";
import { router } from "@inertiajs/react";
import { Button, Flex, SegmentedControl, Select, Text } from "@radix-ui/themes";
import {
    endOfMonth,
    format,
    startOfMonth,
    startOfYear,
    subDays,
    subMonths,
} from "date-fns";
import { ReactNode, useEffect, useState } from "react";
import { BsFileExcel } from "react-icons/bs";

interface Totals {
    sale: number;
    purchase: number;
    profit: number;
    margin: number | null;
    notes_count: number;
    avg_ticket: number | null;
}

interface ProductRow {
    brand: string;
    model: string;
    measure: string;
    units: number;
    sale: number;
    profit: number;
    notes_count: number;
}

interface Props extends PageProps {
    filters: {
        from: string;
        to: string;
        branch: number | null;
        branch_name: string;
        granularity: "day" | "month";
        today: string;
    };
    sales: { current: Totals; previous: Totals; previous_range: [string, string] };
    salesSeries: { key: string; sale: number; purchase: number; profit: number; notes_count: number }[];
    salesByBranch: { branch_id: number; name: string; sale: number; profit: number; margin: number | null; notes_count: number }[];
    collections: {
        totals: { cash: number; card: number; transfer: number; total: number };
        series: { key: string; cash: number; card: number; transfer: number }[];
    };
    receivables: {
        total: number;
        notes_count: number;
        aging: { label: string; amount: number; notes_count: number }[];
        oldest: { id: number; folio: string; customer: string | null; date: string; branch: string; sale_total: number; balance: number; age_days: number }[];
    };
    products: { by_sale: ProductRow[]; by_units: ProductRow[]; by_profit: ProductRow[] };
    customers: { customer: string; notes_count: number; sale: number; balance: number }[];
    inventory: {
        value_at_cost: number;
        units: number;
        products_total: number;
        products_in_stock: number;
        products_out_of_stock: number;
        products_low_stock: number;
        low_stock_threshold: number;
        low_stock: { id: number; brand: string; model: string; measure: string; quantity: number; cost: number }[];
        entries: { movements: number; units: number; value_at_cost: number };
    };
}

const ymd = (d: Date) => format(d, "yyyy-MM-dd");

const presets = (today: Date) => [
    { key: "month", label: "Este mes", from: startOfMonth(today), to: today },
    { key: "last-month", label: "Mes pasado", from: startOfMonth(subMonths(today, 1)), to: endOfMonth(subMonths(today, 1)) },
    { key: "30d", label: "Últimos 30 días", from: subDays(today, 29), to: today },
    { key: "90d", label: "Últimos 90 días", from: subDays(today, 89), to: today },
    { key: "year", label: "Este año", from: startOfYear(today), to: today },
];

const COLLECTION_SERIES: ColumnSeries[] = [
    { key: "cash", label: "Efectivo", color: SERIES.blue },
    { key: "card", label: "Tarjeta", color: SERIES.orange },
    { key: "transfer", label: "Transferencia", color: SERIES.aqua },
];

const AGING_LABELS: Record<string, string> = {
    "0-30": "0 a 30 días",
    "31-60": "31 a 60 días",
    "61-90": "61 a 90 días",
    "90+": "Más de 90 días",
};

const Card = ({ title, subtitle, actions, children, className = "" }: {
    title: string;
    subtitle?: ReactNode;
    actions?: ReactNode;
    children: ReactNode;
    className?: string;
}) => (
    <section className={`p-4 bg-white border border-gray-200 rounded-lg ${className}`}>
        <div className="flex flex-wrap items-start justify-between gap-2 mb-4">
            <div>
                <h2 className="text-base font-semibold text-gray-900">{title}</h2>
                {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
            </div>
            {actions}
        </div>
        {children}
    </section>
);

const Empty = ({ children }: { children: ReactNode }) => (
    <p className="py-8 text-sm text-center text-gray-500">{children}</p>
);

const money = (v: number | null) => (v === null ? "-" : formatCurrency(v));

const Dashboard = ({
    filters,
    sales,
    salesSeries,
    salesByBranch,
    collections,
    receivables,
    products,
    customers,
    inventory,
}: Props) => {
    const { branches } = useBranch();
    const today = new Date(`${filters.today}T00:00:00`);
    const activePreset = presets(today).find(
        (p) => ymd(p.from) === filters.from && ymd(p.to) === filters.to
    )?.key ?? "custom";

    const [customFrom, setCustomFrom] = useState(filters.from);
    const [customTo, setCustomTo] = useState(filters.to);
    useEffect(() => {
        setCustomFrom(filters.from);
        setCustomTo(filters.to);
    }, [filters.from, filters.to]);
    const [productTab, setProductTab] = useState<"by_sale" | "by_units" | "by_profit">("by_sale");

    const apply = (next: Partial<{ from: string; to: string; branch: number | null }>) => {
        const params = { from: filters.from, to: filters.to, branch: filters.branch, ...next };
        router.get(
            route("admin.dashboard"),
            { from: params.from, to: params.to, ...(params.branch ? { branch: params.branch } : {}) },
            { preserveScroll: true, preserveState: true, replace: true }
        );
    };

    const cur = sales.current;
    const prev = sales.previous;
    const hasSales = cur.notes_count > 0;
    const unit = filters.granularity === "day" ? "día" : "mes";
    const exportUrl = route("admin.dashboard.export", {
        from: filters.from,
        to: filters.to,
        ...(filters.branch ? { branch: filters.branch } : {}),
    });

    return (
        <Container headTitle="Dashboard">
            <Flex justify="between" align="start" wrap="wrap" gap="3" className="mb-4">
                <div>
                    <Text size="6" className="block font-semibold">Dashboard</Text>
                    <Text size="2" color="gray">
                        {filters.from} a {filters.to} · {filters.branch_name}
                    </Text>
                </div>
                <Button asChild color="green" variant="soft">
                    <a href={exportUrl}>
                        Exportar Excel <BsFileExcel />
                    </a>
                </Button>
            </Flex>

            {/* Filtros: una sola fila sobre todas las gráficas */}
            <div className="flex flex-wrap items-end gap-3 p-3 mb-6 border border-gray-200 rounded-lg bg-gray-50">
                <div className="flex flex-wrap gap-1">
                    {presets(today).map((p) => (
                        <Button
                            key={p.key}
                            size="1"
                            variant={activePreset === p.key ? "solid" : "soft"}
                            color={activePreset === p.key ? undefined : "gray"}
                            className="hover:cursor-pointer"
                            onClick={() => apply({ from: ymd(p.from), to: ymd(p.to) })}
                        >
                            {p.label}
                        </Button>
                    ))}
                </div>
                <form
                    className="flex flex-wrap items-end gap-2"
                    onSubmit={(e) => {
                        e.preventDefault();
                        apply({ from: customFrom, to: customTo });
                    }}
                >
                    <label className="text-xs text-gray-600">
                        Desde
                        <input type="date" value={customFrom} max={customTo}
                            onChange={(e) => setCustomFrom(e.target.value)}
                            className="block px-2 py-1 text-sm border-gray-300 rounded-md" />
                    </label>
                    <label className="text-xs text-gray-600">
                        Hasta
                        <input type="date" value={customTo} min={customFrom}
                            onChange={(e) => setCustomTo(e.target.value)}
                            className="block px-2 py-1 text-sm border-gray-300 rounded-md" />
                    </label>
                    <Button size="1" type="submit" variant={activePreset === "custom" ? "solid" : "soft"} className="hover:cursor-pointer">
                        Aplicar
                    </Button>
                </form>
                <div className="ml-auto">
                    <div className="text-xs text-gray-600">Sucursal</div>
                    <Select.Root
                        value={filters.branch ? String(filters.branch) : "all"}
                        onValueChange={(v) => apply({ branch: v === "all" ? null : Number(v) })}
                    >
                        <Select.Trigger className="min-w-[180px]" />
                        <Select.Content>
                            <Select.Item value="all">Todas</Select.Item>
                            {branches.map((b) => (
                                <Select.Item key={b.id} value={String(b.id)}>{b.name}</Select.Item>
                            ))}
                        </Select.Content>
                    </Select.Root>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 gap-3 mb-6 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
                <StatTile label="Venta" value={money(cur.sale)} change={percentChange(cur.sale, prev.sale)} />
                <StatTile label="Utilidad" value={money(cur.profit)} change={percentChange(cur.profit, prev.profit)}
                    hint={`Costo ${money(cur.purchase)}`} />
                <StatTile label="Margen" value={cur.margin === null ? "-" : `${cur.margin}%`}
                    hint={prev.margin === null ? undefined : `Antes ${prev.margin}%`} />
                <StatTile label="Notas" value={formatNumber(cur.notes_count)} change={percentChange(cur.notes_count, prev.notes_count)} />
                <StatTile label="Ticket promedio" value={money(cur.avg_ticket)} change={percentChange(cur.avg_ticket, prev.avg_ticket)} />
                <StatTile label="Cobrado" value={money(collections.totals.total)} hint="Pagos recibidos en el periodo" />
            </div>

            <div className="grid grid-cols-1 gap-4 mb-4 xl:grid-cols-3">
                <Card title={`Venta por ${unit}`} subtitle="Notas no canceladas, por fecha de la nota" className="xl:col-span-2">
                    {hasSales ? (
                        <ColumnChart
                            data={salesSeries}
                            series={[{ key: "sale", label: "Venta", color: SERIES.blue }]}
                            tooltipExtra={(row) => (
                                <div className="pt-1 mt-1 space-y-0.5 text-gray-600 border-t border-gray-100">
                                    <div className="flex justify-between"><span>Costo</span><span className="tabular-nums">{formatCurrency(Number(row.purchase))}</span></div>
                                    <div className="flex justify-between"><span>Utilidad</span><span className="tabular-nums">{formatCurrency(Number(row.profit))}</span></div>
                                    <div className="flex justify-between"><span>Notas</span><span className="tabular-nums">{row.notes_count}</span></div>
                                </div>
                            )}
                        />
                    ) : (
                        <Empty>No hay ventas en este periodo.</Empty>
                    )}
                </Card>

                <Card title="Por sucursal" subtitle="Siempre compara todas las sucursales">
                    <BarList
                        items={salesByBranch.map((b) => ({
                            key: b.branch_id,
                            label: b.name,
                            value: b.sale,
                            display: formatCurrency(b.sale),
                            detail: `Utilidad ${formatCurrency(b.profit)} · Margen ${b.margin ?? "-"}% · ${b.notes_count} notas`,
                        }))}
                    />
                </Card>
            </div>

            <div className="grid grid-cols-1 gap-4 mb-4 xl:grid-cols-3">
                <Card
                    title={`Cobranza por ${unit}`}
                    subtitle="Por fecha de cada pago, incluye abonos a notas anteriores"
                    actions={<Legend series={COLLECTION_SERIES} />}
                    className="xl:col-span-2"
                >
                    {collections.totals.total > 0 ? (
                        <>
                            <ColumnChart data={collections.series} series={COLLECTION_SERIES} />
                            <div className="grid grid-cols-3 gap-2 mt-3 text-sm">
                                {COLLECTION_SERIES.map((s) => (
                                    <div key={s.key} className="flex items-center gap-2">
                                        <span className="inline-block w-3 h-3 rounded-sm" style={{ background: s.color }} />
                                        <span className="text-gray-600">{s.label}</span>
                                        <span className="ml-auto font-medium tabular-nums">
                                            {formatCurrency(collections.totals[s.key as "cash"])}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <Empty>No se recibieron pagos en este periodo.</Empty>
                    )}
                </Card>

                <Card title="Cuentas por cobrar" subtitle="Saldo pendiente a hoy, por antigüedad de la nota">
                    <div className="mb-4">
                        <div className="text-2xl font-semibold text-gray-900">{formatCurrency(receivables.total)}</div>
                        <div className="text-xs text-gray-500">{receivables.notes_count} notas con saldo</div>
                    </div>
                    <BarList
                        items={receivables.aging.map((a, i) => ({
                            key: a.label,
                            label: AGING_LABELS[a.label],
                            value: a.amount,
                            display: formatCurrency(a.amount),
                            detail: `${a.notes_count} notas`,
                            color: ORDINAL_BLUE[i],
                        }))}
                    />
                </Card>
            </div>

            <Card title="Notas con saldo más antiguas" subtitle="Para dar seguimiento de cobranza" className="mb-4">
                {receivables.oldest.length === 0 ? (
                    <Empty>No hay notas con saldo pendiente.</Empty>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="text-xs text-left text-gray-500 uppercase border-b">
                                <tr>
                                    <th className="py-2 pr-3">Folio</th>
                                    <th className="py-2 pr-3">Cliente</th>
                                    <th className="py-2 pr-3">Sucursal</th>
                                    <th className="py-2 pr-3">Fecha</th>
                                    <th className="py-2 pr-3 text-right">Días</th>
                                    <th className="py-2 pr-3 text-right">Venta</th>
                                    <th className="py-2 text-right">Saldo</th>
                                </tr>
                            </thead>
                            <tbody className="tabular-nums">
                                {receivables.oldest.map((n) => (
                                    <tr key={n.id} className="border-b border-gray-100 hover:bg-gray-50">
                                        <td className="py-2 pr-3">
                                            <a href={route("notes.show", n.id)} className="text-blue-700 hover:underline">{n.folio}</a>
                                        </td>
                                        <td className="py-2 pr-3">{n.customer || "-"}</td>
                                        <td className="py-2 pr-3">{n.branch}</td>
                                        <td className="py-2 pr-3">{n.date}</td>
                                        <td className={`py-2 pr-3 text-right ${n.age_days > 60 ? "text-[#d03b3b] font-medium" : ""}`}>{n.age_days}</td>
                                        <td className="py-2 pr-3 text-right">{formatCurrency(n.sale_total)}</td>
                                        <td className="py-2 font-medium text-right">{formatCurrency(n.balance)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            <div className="grid grid-cols-1 gap-4 mb-4 xl:grid-cols-2">
                <Card
                    title="Productos más vendidos"
                    subtitle="Partidas de notas no canceladas en el periodo"
                    actions={
                        <SegmentedControl.Root size="1" value={productTab} onValueChange={(v) => setProductTab(v as typeof productTab)}>
                            <SegmentedControl.Item value="by_sale">Venta</SegmentedControl.Item>
                            <SegmentedControl.Item value="by_units">Unidades</SegmentedControl.Item>
                            <SegmentedControl.Item value="by_profit">Utilidad</SegmentedControl.Item>
                        </SegmentedControl.Root>
                    }
                >
                    {products[productTab].length === 0 ? (
                        <Empty>No hay productos vendidos en este periodo.</Empty>
                    ) : (
                        <BarList
                            items={products[productTab].map((p, i) => {
                                const value = productTab === "by_units" ? p.units : productTab === "by_profit" ? p.profit : p.sale;
                                return {
                                    key: `${p.brand}-${p.model}-${p.measure}-${i}`,
                                    label: `${p.brand} ${p.model} ${p.measure ?? ""}`.trim(),
                                    value: Math.max(value, 0),
                                    display: productTab === "by_units" ? `${formatNumber(p.units, 2)} u.` : formatCurrency(value),
                                    detail: `${formatNumber(p.units, 2)} u. · Venta ${formatCurrency(p.sale)} · Utilidad ${formatCurrency(p.profit)}`,
                                };
                            })}
                        />
                    )}
                </Card>

                <Card title="Mejores clientes" subtitle="Por venta en el periodo; el saldo es de esas notas">
                    {customers.length === 0 ? (
                        <Empty>No hay clientes con ventas en este periodo.</Empty>
                    ) : (
                        <BarList
                            items={customers.map((c) => ({
                                key: c.customer,
                                label: c.customer,
                                value: c.sale,
                                display: formatCurrency(c.sale),
                                detail: `${c.notes_count} notas${c.balance > 0 ? ` · Debe ${formatCurrency(c.balance)}` : ""}`,
                            }))}
                        />
                    )}
                </Card>
            </div>

            <Card title="Inventario" subtitle={`Existencias a hoy${filters.branch ? ` en ${filters.branch_name}` : " (todas las sucursales)"}; entradas dentro del periodo`}>
                <div className="grid grid-cols-1 gap-3 mb-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
                    <StatTile label="Valor a costo" value={formatCurrency(inventory.value_at_cost)} />
                    <StatTile label="Unidades" value={formatNumber(inventory.units, 2)} />
                    <StatTile label="Con existencia" value={formatNumber(inventory.products_in_stock)} hint={`de ${formatNumber(inventory.products_total)} productos`} />
                    <StatTile label="Sin existencia" value={formatNumber(inventory.products_out_of_stock)} />
                    <StatTile label="Stock bajo" value={formatNumber(inventory.products_low_stock)} hint={`${inventory.low_stock_threshold} unidades o menos`} />
                    <StatTile label="Entradas del periodo" value={formatCurrency(inventory.entries.value_at_cost)}
                        hint={`${formatNumber(inventory.entries.units, 2)} u. en ${inventory.entries.movements} movimientos`} />
                </div>
                {inventory.low_stock.length > 0 && (
                    <>
                        <h3 className="mb-2 text-sm font-semibold text-gray-800">Productos con stock bajo</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="text-xs text-left text-gray-500 uppercase border-b">
                                    <tr>
                                        <th className="py-2 pr-3">Marca</th>
                                        <th className="py-2 pr-3">Modelo</th>
                                        <th className="py-2 pr-3">Medida</th>
                                        <th className="py-2 pr-3 text-right">Existencia</th>
                                        <th className="py-2 text-right">Costo</th>
                                    </tr>
                                </thead>
                                <tbody className="tabular-nums">
                                    {inventory.low_stock.map((p) => (
                                        <tr key={p.id} className="border-b border-gray-100">
                                            <td className="py-2 pr-3">{p.brand}</td>
                                            <td className="py-2 pr-3">{p.model}</td>
                                            <td className="py-2 pr-3">{p.measure}</td>
                                            <td className="py-2 pr-3 text-right">{formatNumber(p.quantity, 2)}</td>
                                            <td className="py-2 text-right">{formatCurrency(p.cost)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </Card>
        </Container>
    );
};

export default Dashboard;
