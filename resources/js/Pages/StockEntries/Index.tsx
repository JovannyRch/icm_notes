import Container from "@/Components/Container";
import Pagination from "@/Components/Pagination";
import PageHeader from "@/Components/ui/PageHeader";
import { formatCurrency, formatDate } from "@/helpers/formatters";
import useAlerts from "@/hooks/useAlerts";
import { useBranch } from "@/hooks/useBranch";
import { PageProps } from "@/types";
import { Link, router } from "@inertiajs/react";
import { Badge, Button } from "@radix-ui/themes";
import { useEffect, useRef, useState } from "react";
import { LuPackagePlus, LuSearch, LuX } from "react-icons/lu";

export interface EntryItem {
    id: number;
    product_id: number | null;
    brand: string | null;
    model: string | null;
    measure: string | null;
    mc: string | null;
    unit: string | null;
    quantity: number;
    cost: number;
    iva: number;
    extra: number;
    subtotal: number;
}

export interface StockEntry {
    id: number;
    date: string;
    supplier: string | null;
    reference: string | null;
    notes: string | null;
    total: number;
    status: "pending" | "paid";
    created_at: string;
    user?: { id: number; name: string } | null;
    branch?: { id: number; name: string } | null;
    items: EntryItem[];
}

interface Props extends PageProps {
    pagination: { data: StockEntry[] } & Record<string, any>;
    filters: { query: string; estado: "pending" | "paid" | null; desde: string | null; hasta: string | null };
    totals: { count: number; total: number; pending: number; pending_count: number };
}

export const EntryStatusBadge = ({ status }: { status: StockEntry["status"] }) =>
    status === "paid" ? (
        <Badge color="green" variant="soft">
            Pagada
        </Badge>
    ) : (
        <Badge color="amber" variant="soft">
            Por pagar
        </Badge>
    );

const Tile = ({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: "amber" }) => (
    <div className={`p-3 border rounded-card ${tone === "amber" ? "bg-amber-tint border-transparent" : "bg-white border-ash"}`}>
        <div className={`text-xs font-medium ${tone === "amber" ? "text-amber-900" : "text-steel"}`}>{label}</div>
        <div className={`mt-1 text-xl font-semibold tabular-nums ${tone === "amber" ? "text-amber-900" : "text-charcoal"}`}>{value}</div>
        {hint && <div className={`text-xs ${tone === "amber" ? "text-amber-900/80" : "text-fog"}`}>{hint}</div>}
    </div>
);

const productsText = (e: StockEntry) => {
    const names = e.items.map((i) => [i.brand, i.model].filter(Boolean).join(" "));
    return names.length <= 2 ? names.join(", ") : `${names.slice(0, 2).join(", ")} y ${names.length - 2} más`;
};

const pieces = (e: StockEntry) => {
    const n = e.items.reduce((a, i) => a + Number(i.quantity), 0);
    return Number.isInteger(n) ? n : n.toFixed(2);
};

/** Notas de entrada de la sucursal: qué se compró, a quién y cuánto se le debe al proveedor. */
const StockEntriesIndex = ({ pagination, filters, totals, flash }: Props) => {
    useAlerts(flash);
    const { currentBranchName } = useBranch();
    const entries = pagination.data;

    const [query, setQuery] = useState(filters.query ?? "");
    const first = useRef(true);

    const go = (patch: Record<string, string | null>) => {
        const next: Record<string, string> = {};
        const merged = { ...filters, ...patch } as Record<string, string | null>;
        Object.entries(merged).forEach(([k, v]) => {
            if (v) next[k] = v;
        });
        router.get(route("stock-entries.index"), next, { preserveState: true, preserveScroll: true, replace: true });
    };

    useEffect(() => {
        if (first.current) {
            first.current = false;
            return;
        }
        const t = setTimeout(() => go({ query: query.trim() || null }), 300);
        return () => clearTimeout(t);
    }, [query]);

    const hasFilters = !!(filters.query || filters.estado || filters.desde || filters.hasta);
    const chip = (active: boolean) =>
        `h-8 px-3 text-[13px] rounded-tag border ${active ? "bg-ink border-ink text-white" : "bg-white border-ash text-steel hover:border-pebble"}`;

    return (
        <Container headTitle="Notas de entrada">
            <PageHeader
                eyebrow={currentBranchName}
                title="Notas de entrada"
                description="Compras a proveedores que sumaron piezas al inventario."
                actions={
                    <Button onClick={() => router.visit(route("stock-entries.create"))}>
                        <LuPackagePlus /> Nueva nota de entrada
                    </Button>
                }
            />

            <div className="grid grid-cols-1 gap-3 mb-4 sm:grid-cols-3">
                <Tile label="Total comprado" value={formatCurrency(totals.total)} hint={`${totals.count} ${totals.count === 1 ? "nota" : "notas"}`} />
                <Tile
                    label="Por pagar a proveedores"
                    value={formatCurrency(totals.pending)}
                    hint={totals.pending_count > 0 ? `${totals.pending_count} ${totals.pending_count === 1 ? "nota" : "notas"} sin pagar` : "todo pagado"}
                    tone={totals.pending_count > 0 ? "amber" : undefined}
                />
                <Tile label="Pagado" value={formatCurrency(round(totals.total - totals.pending))} />
            </div>

            <div className="flex flex-wrap items-center gap-2 mb-4">
                <div className="relative w-full sm:w-80">
                    <LuSearch className="absolute w-4 h-4 -translate-y-1/2 left-2.5 top-1/2 text-fog" aria-hidden />
                    <input
                        type="search"
                        aria-label="Buscar notas de entrada"
                        placeholder="Proveedor, factura, producto o número…"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="w-full h-8 pr-2.5 text-sm bg-white border pl-8 rounded-input border-pebble focus:border-electric focus:ring-2 focus:ring-electric/20"
                    />
                </div>
                {([
                    [null, "Todas"],
                    ["pending", "Por pagar"],
                    ["paid", "Pagadas"],
                ] as const).map(([value, label]) => (
                    <button key={label} type="button" className={chip(filters.estado === value)} onClick={() => go({ estado: value })}>
                        {label}
                    </button>
                ))}
                <label className="inline-flex items-center gap-1 text-[13px] text-steel">
                    Desde
                    <input
                        type="date"
                        aria-label="Desde"
                        value={filters.desde ?? ""}
                        onChange={(e) => go({ desde: e.target.value || null })}
                        className="h-8 px-2 text-[13px] bg-white border rounded-input border-ash"
                    />
                </label>
                <label className="inline-flex items-center gap-1 text-[13px] text-steel">
                    Hasta
                    <input
                        type="date"
                        aria-label="Hasta"
                        value={filters.hasta ?? ""}
                        onChange={(e) => go({ hasta: e.target.value || null })}
                        className="h-8 px-2 text-[13px] bg-white border rounded-input border-ash"
                    />
                </label>
                {hasFilters && (
                    <Button
                        variant="ghost"
                        color="gray"
                        onClick={() => {
                            setQuery("");
                            router.get(route("stock-entries.index"));
                        }}
                    >
                        <LuX /> Quitar filtros
                    </Button>
                )}
            </div>

            {entries.length === 0 ? (
                <div className="py-16 text-center bg-white border border-ash rounded-card">
                    <p className="text-sm text-steel">{hasFilters ? "No hay notas de entrada con esos filtros." : "Todavía no hay notas de entrada en esta sucursal."}</p>
                    {!hasFilters && (
                        <Button className="mt-3" variant="outline" color="gray" onClick={() => router.visit(route("stock-entries.create"))}>
                            <LuPackagePlus /> Registrar la primera
                        </Button>
                    )}
                </div>
            ) : (
                <>
                    {/* Escritorio: tabla */}
                    <div className="hidden overflow-hidden bg-white border md:block border-ash rounded-card">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-xs text-left border-b text-fog border-ash">
                                    <th className="px-4 py-2 font-medium">No.</th>
                                    <th className="px-3 py-2 font-medium">Fecha</th>
                                    <th className="px-3 py-2 font-medium">Proveedor</th>
                                    <th className="px-3 py-2 font-medium">Productos</th>
                                    <th className="px-3 py-2 font-medium text-right">Piezas</th>
                                    <th className="px-3 py-2 font-medium text-right">Total</th>
                                    <th className="px-4 py-2 font-medium">Pago</th>
                                </tr>
                            </thead>
                            <tbody>
                                {entries.map((e) => (
                                    <tr
                                        key={e.id}
                                        onClick={() => router.visit(route("stock-entries.show", e.id))}
                                        className="border-b cursor-pointer border-ash/70 last:border-0 hover:bg-paper"
                                    >
                                        <td className="px-4 py-2.5 font-semibold text-charcoal">
                                            <Link href={route("stock-entries.show", e.id)} onClick={(ev) => ev.stopPropagation()}>
                                                #{e.id}
                                            </Link>
                                        </td>
                                        <td className="px-3 py-2.5 whitespace-nowrap text-steel">{formatDate(e.date)}</td>
                                        <td className="px-3 py-2.5">
                                            <div className="text-charcoal">{e.supplier ?? <span className="text-fog">Sin proveedor</span>}</div>
                                            {e.reference && <div className="text-xs text-fog">{e.reference}</div>}
                                        </td>
                                        <td className="px-3 py-2.5 text-steel">{productsText(e)}</td>
                                        <td className="px-3 py-2.5 text-right tabular-nums text-steel">{pieces(e)}</td>
                                        <td className="px-3 py-2.5 font-semibold text-right tabular-nums text-charcoal">{formatCurrency(e.total)}</td>
                                        <td className="px-4 py-2.5">
                                            <EntryStatusBadge status={e.status} />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Móvil: tarjetas */}
                    <div className="space-y-2 md:hidden">
                        {entries.map((e) => (
                            <Link key={e.id} href={route("stock-entries.show", e.id)} className="block p-3 bg-white border border-ash rounded-card">
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <div className="font-semibold text-charcoal">
                                            #{e.id} · {e.supplier ?? "Sin proveedor"}
                                        </div>
                                        <div className="text-xs text-fog">
                                            {formatDate(e.date)} · {pieces(e)} piezas
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-semibold tabular-nums text-charcoal">{formatCurrency(e.total)}</div>
                                        <EntryStatusBadge status={e.status} />
                                    </div>
                                </div>
                                <div className="mt-1 text-xs text-steel">{productsText(e)}</div>
                            </Link>
                        ))}
                    </div>

                    <div className="mt-4">
                        <Pagination pagination={pagination as any} />
                    </div>
                </>
            )}
        </Container>
    );
};

const round = (n: number) => Math.round(n * 100) / 100;

export default StockEntriesIndex;
