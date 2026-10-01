import BarList from "@/Components/Charts/BarList";
import ColumnChart, { ColumnSeries } from "@/Components/Charts/ColumnChart";
import Legend from "@/Components/Charts/Legend";
import StatTile from "@/Components/Charts/StatTile";
import Container from "@/Components/Container";
import SectionCard from "@/Components/SectionCard";
import {
    ORDINAL_BLUE,
    SERIES,
    formatNumber,
    percentChange,
} from "@/helpers/analytics";
import { formatCurrency } from "@/helpers/formatters";
import { useBranch } from "@/hooks/useBranch";
import { PageProps } from "@/types";
import { Link, router } from "@inertiajs/react";
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
import {
    LuCalculator,
    LuCalendarRange,
    LuDownload,
    LuFilePlus,
    LuHistory,
    LuPackage,
    LuPackagePlus,
} from "react-icons/lu";
import PageHeader from "@/Components/ui/PageHeader";

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
        oldest: { id: number; folio: string; date: string; branch: string; sale_total: number; balance: number; age_days: number }[];
    };
    products: { by_sale: ProductRow[]; by_units: ProductRow[]; by_profit: ProductRow[] };
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

const QUICK_ACTIONS = [
    // Un solo acento por tarjeta (DESIGN.md): azul ventas, verde compras, naranja cortes, violeta catálogo.
    { label: "Nota de venta", hint: "Crear", route: "notes.create", icon: LuFilePlus, tone: "bg-sky-tint text-electric" },
    { label: "Nota de entrada", hint: "Registrar compra", route: "stock-entries.create", icon: LuPackagePlus, tone: "bg-mint text-vivid-green" },
    { label: "Corte del día", hint: "Generar", route: "cortes.new", icon: LuCalculator, tone: "bg-orange-50 text-tangerine" },
    { label: "Cortes", hint: "Ver historial", route: "cortes", icon: LuHistory, tone: "bg-orange-50 text-tangerine" },
    { label: "Corte semanal", hint: "Generar", route: "cortes_semanales.create", icon: LuCalendarRange, tone: "bg-orange-50 text-tangerine" },
    { label: "Productos", hint: "Catálogo y stock", route: "products", icon: LuPackage, tone: "bg-violet-50 text-lavender" },
];

const QuickActions = () => (
    <nav aria-label="Accesos rápidos" className="grid grid-cols-2 gap-3 mb-6 sm:grid-cols-3 xl:grid-cols-6">
        {QUICK_ACTIONS.map((a) => (
            <Link
                key={a.route}
                href={route(a.route)}
                className="flex items-center gap-2 p-3 transition bg-white sm:gap-3 border border-ash rounded-card hover:border-pebble hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-electric/30"
            >
                <span className={`flex items-center justify-center rounded-button shrink-0 w-9 h-9 ${a.tone}`}>
                    <a.icon className="w-5 h-5" aria-hidden />
                </span>
                <span className="min-w-0">
                    <span className="block text-sm font-medium leading-tight text-charcoal sm:truncate">{a.label}</span>
                    <span className="hidden text-xs text-fog truncate sm:block">{a.hint}</span>
                </span>
            </Link>
        ))}
    </nav>
);

const AGING_LABELS: Record<string, string> = {
    "0-30": "0 a 30 días",
    "31-60": "31 a 60 días",
    "61-90": "61 a 90 días",
    "90+": "Más de 90 días",
};

const Empty = ({ children }: { children: ReactNode }) => (
    <p className="py-8 text-sm text-center text-fog">{children}</p>
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
            route("dashboard"),
            { from: params.from, to: params.to, ...(params.branch ? { branch: params.branch } : {}) },
            { preserveScroll: true, preserveState: true, replace: true }
        );
    };

    const cur = sales.current;
    const prev = sales.previous;
    const hasSales = cur.notes_count > 0;
    const unit = filters.granularity === "day" ? "día" : "mes";
    const exportUrl = route("dashboard.export", {
        from: filters.from,
        to: filters.to,
        ...(filters.branch ? { branch: filters.branch } : {}),
    });

    return (
        <Container headTitle="Dashboard">
            <PageHeader
                title="Dashboard"
                description={`${filters.from} a ${filters.to} · ${filters.branch_name}`}
                actions={
                    <Button asChild variant="outline" color="gray">
                        <a href={exportUrl}>
                            <LuDownload /> Exportar Excel
                        </a>
                    </Button>
                }
            />

            <QuickActions />

            {/* Filtros: una sola fila sobre todas las gráficas */}
            <div className="flex flex-wrap items-end gap-3 p-3 mb-6 rounded-card-lg bg-[#fafafa]">
                <div role="group" aria-label="Rango de fechas" className="inline-flex flex-wrap gap-0.5 p-0.5 bg-white border border-ash rounded-tag">
                    {presets(today).map((p) => (
                        <button
                            key={p.key}
                            type="button"
                            aria-pressed={activePreset === p.key}
                            onClick={() => apply({ from: ymd(p.from), to: ymd(p.to) })}
                            className={`h-7 px-3 text-[13px] font-medium rounded-tag transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-electric/30 ${
                                activePreset === p.key ? "bg-ink text-white" : "text-steel hover:text-charcoal hover:bg-paper"
                            }`}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>
                <form
                    className="flex flex-wrap items-end gap-2"
                    onSubmit={(e) => {
                        e.preventDefault();
                        apply({ from: customFrom, to: customTo });
                    }}
                >
                    <label className="text-xs text-steel">
                        Desde
                        <input type="date" value={customFrom} max={customTo}
                            onChange={(e) => setCustomFrom(e.target.value)}
                            className="block h-8 px-2 text-sm bg-white" />
                    </label>
                    <label className="text-xs text-steel">
                        Hasta
                        <input type="date" value={customTo} min={customFrom}
                            onChange={(e) => setCustomTo(e.target.value)}
                            className="block h-8 px-2 text-sm bg-white" />
                    </label>
                    <Button type="submit" variant="outline" color="gray">
                        Aplicar
                    </Button>
                </form>
                <div className="ml-auto">
                    <div className="text-xs text-steel">Sucursal</div>
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
                <SectionCard title={`Venta por ${unit}`} subtitle="Notas no canceladas, por fecha de la nota" className="xl:col-span-2">
                    {hasSales ? (
                        <ColumnChart
                            data={salesSeries}
                            series={[{ key: "sale", label: "Venta", color: SERIES.blue }]}
                            tooltipExtra={(row) => (
                                <div className="pt-1 mt-1 space-y-0.5 text-steel border-t border-ash">
                                    <div className="flex justify-between"><span>Costo</span><span className="tabular-nums">{formatCurrency(Number(row.purchase))}</span></div>
                                    <div className="flex justify-between"><span>Utilidad</span><span className="tabular-nums">{formatCurrency(Number(row.profit))}</span></div>
                                    <div className="flex justify-between"><span>Notas</span><span className="tabular-nums">{row.notes_count}</span></div>
                                </div>
                            )}
                        />
                    ) : (
                        <Empty>No hay ventas en este periodo.</Empty>
                    )}
                </SectionCard>

                <SectionCard title="Por sucursal" subtitle="Siempre compara todas las sucursales">
                    <BarList
                        items={salesByBranch.map((b) => ({
                            key: b.branch_id,
                            label: b.name,
                            value: b.sale,
                            display: formatCurrency(b.sale),
                            detail: `Utilidad ${formatCurrency(b.profit)} · Margen ${b.margin ?? "-"}% · ${b.notes_count} notas`,
                        }))}
                    />
                </SectionCard>
            </div>

            <div className="grid grid-cols-1 gap-4 mb-4 xl:grid-cols-3">
                <SectionCard
                    title={`Cobranza por ${unit}`}
                    subtitle="Por fecha de cada pago, incluye abonos a notas anteriores"
                    actions={<Legend series={COLLECTION_SERIES} />}
                    className="xl:col-span-2"
                >
                    {collections.totals.total > 0 ? (
                        <>
                            <ColumnChart data={collections.series} series={COLLECTION_SERIES} />
                            <div className="grid grid-cols-1 gap-2 mt-3 text-sm sm:grid-cols-3 sm:gap-4">
                                {COLLECTION_SERIES.map((s) => (
                                    <div key={s.key} className="flex items-center gap-2">
                                        <span className="inline-block w-3 h-3 rounded-sm" style={{ background: s.color }} />
                                        <span className="text-steel">{s.label}</span>
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
                </SectionCard>

                <SectionCard title="Cuentas por cobrar" subtitle="Saldo pendiente a hoy, por antigüedad de la nota">
                    <div className="mb-4">
                        <div className="text-2xl font-semibold text-charcoal">{formatCurrency(receivables.total)}</div>
                        <div className="text-xs text-fog">{receivables.notes_count} notas con saldo</div>
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
                </SectionCard>
            </div>

            <div className="grid grid-cols-1 gap-4 mb-4 xl:grid-cols-3">
                <SectionCard title="Notas con saldo más antiguas" subtitle="Para dar seguimiento de cobranza" className="xl:col-span-2">
                    {receivables.oldest.length === 0 ? (
                        <Empty>No hay notas con saldo pendiente.</Empty>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="text-xs text-left text-fog uppercase border-b">
                                    <tr>
                                        <th className="py-2 pr-3">Folio</th>
                                        <th className="py-2 pr-3">Sucursal</th>
                                        <th className="py-2 pr-3">Fecha</th>
                                        <th className="py-2 pr-3 text-right">Días</th>
                                        <th className="py-2 pr-3 text-right">Venta</th>
                                        <th className="py-2 text-right">Saldo</th>
                                    </tr>
                                </thead>
                                <tbody className="tabular-nums">
                                    {receivables.oldest.map((n) => (
                                        <tr key={n.id} className="border-b border-ash hover:bg-paper">
                                            <td className="py-2 pr-3">
                                                <a href={route("notes.show", n.id)} className="text-electric hover:underline">{n.folio}</a>
                                            </td>
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
                </SectionCard>

                <SectionCard
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
                </SectionCard>
            </div>

            <SectionCard title="Inventario" subtitle={`Existencias a hoy${filters.branch ? ` en ${filters.branch_name}` : " (todas las sucursales)"}; entradas dentro del periodo`}>
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
                        <h3 className="mb-2 text-sm font-semibold text-charcoal">Productos con stock bajo</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="text-xs text-left text-fog uppercase border-b">
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
                                        <tr key={p.id} className="border-b border-ash">
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
            </SectionCard>
        </Container>
    );
};

export default Dashboard;
