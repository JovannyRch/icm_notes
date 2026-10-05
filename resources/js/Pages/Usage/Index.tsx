import ColumnChart, { ColumnSeries } from "@/Components/Charts/ColumnChart";
import Legend from "@/Components/Charts/Legend";
import StatTile from "@/Components/Charts/StatTile";
import Container from "@/Components/Container";
import SectionCard from "@/Components/SectionCard";
import PageHeader from "@/Components/ui/PageHeader";
import { SERIES } from "@/helpers/analytics";
import { formatCurrency } from "@/helpers/formatters";
import { PageProps } from "@/types";
import { router } from "@inertiajs/react";
import { Badge, Select } from "@radix-ui/themes";
import { formatDistanceToNowStrict } from "date-fns";
import { es } from "date-fns/locale";
import { ReactNode } from "react";
import {
    LuBan,
    LuCoins,
    LuHandCoins,
    LuPackagePlus,
    LuPencilLine,
    LuPrinter,
    LuReceipt,
    LuRepeat,
    LuTruck,
} from "react-icons/lu";

interface UserRow {
    id: number;
    name: string;
    role: "owner" | "cashier" | "super_admin";
    active: boolean;
    branches: string[];
    caja_count: number;
    caja_amount: number;
    canceled: number;
    manual_count: number;
    tickets: number;
    last_sale: string | null;
    last_activity: string | null;
}

interface BranchRow {
    id: number;
    name: string;
    caja_count: number;
    caja_amount: number;
    manual_count: number;
    adoption: number | null;
    days_with_sales: number;
    cortes: number;
}

interface Props extends PageProps {
    period: { days: number; from: string; to: string };
    kpis: {
        caja_count: number;
        caja_count_prev: number;
        caja_amount: number;
        caja_amount_prev: number;
        manual_count: number;
        manual_amount: number;
        adoption: number | null;
        adoption_amount: number | null;
        avg_ticket: number;
        sellers: number;
        days_with_caja: number;
    };
    daily: { key: string; caja: number; nota: number }[];
    hours: { hour: number; count: number }[];
    users: UserRow[];
    activityTracked: boolean;
    branches: BranchRow[];
    functions: Record<"credit" | "flete" | "price_changed" | "canceled" | "tickets" | "reprints" | "collections" | "entries" | "cortes", number>;
    filters: { dias: number; sucursal: number | null };
    allBranches: { id: number; name: string }[];
}

const SALES_SERIES: ColumnSeries[] = [
    { key: "caja", label: "En caja", color: SERIES.blue },
    { key: "nota", label: "Nota a mano", color: SERIES.orange },
];

const PERIODS = [7, 30, 90];

const change = (now: number, before: number) => (before > 0 ? ((now - before) / before) * 100 : null);
const number = (n: number) => new Intl.NumberFormat("es-MX").format(n);
const ago = (iso: string | null) => (iso ? formatDistanceToNowStrict(new Date(iso), { locale: es, addSuffix: true }) : "nunca");
const pct = (n: number | null) => (n === null ? "—" : `${n.toFixed(n % 1 === 0 ? 0 : 1)}%`);

/** Uso de una función: número grande, nombre y para qué sirve el dato. */
const Feature = ({ icon, label, value, hint }: { icon: ReactNode; label: string; value: number; hint: string }) => (
    <div className="flex items-start gap-3 p-3 border border-ash rounded-card">
        <span className="flex items-center justify-center w-8 h-8 rounded-tag bg-sky-tint text-electric shrink-0">{icon}</span>
        <div className="min-w-0">
            <div className="text-xl font-semibold leading-tight tabular-nums text-charcoal">{number(value)}</div>
            <div className="text-sm font-medium text-graphite">{label}</div>
            <div className="text-xs text-fog">{hint}</div>
        </div>
    </div>
);

/** Barra de adopción: qué parte de las ventas pasó por la caja. */
const AdoptionBar = ({ value }: { value: number | null }) => (
    <div className="flex items-center gap-2">
        <div className="flex-1 h-2 overflow-hidden rounded bg-paper min-w-[60px]">
            <div className="h-full rounded" style={{ width: `${value ?? 0}%`, background: SERIES.blue }} />
        </div>
        <span className="w-12 text-xs text-right tabular-nums text-steel">{pct(value)}</span>
    </div>
);

const UsageIndex = ({ period, kpis, daily, hours, users, activityTracked, branches, functions: features, filters, allBranches }: Props) => {
    const go = (patch: Partial<Props["filters"]>) => {
        const next = { ...filters, ...patch };
        router.get(route("usage.index"), { dias: next.dias, ...(next.sucursal ? { sucursal: next.sucursal } : {}) }, { preserveScroll: true });
    };

    const peak = Math.max(...hours.map((h) => h.count), 0);
    const totalSales = kpis.caja_count + kpis.manual_count;

    return (
        <Container headTitle="Uso del sistema">
            <PageHeader
                eyebrow="Super admin"
                title="Uso del sistema"
                description="¿Se está usando la caja? Ventas de mostrador contra notas capturadas a mano, por usuario y por sucursal."
                actions={
                    <>
                        <div className="flex p-0.5 border rounded-tag border-ash bg-white" role="group" aria-label="Periodo">
                            {PERIODS.map((d) => (
                                <button
                                    key={d}
                                    type="button"
                                    onClick={() => go({ dias: d })}
                                    aria-pressed={filters.dias === d}
                                    className={`h-7 px-3 text-[13px] rounded-tag ${filters.dias === d ? "bg-ink text-white" : "text-steel hover:text-charcoal"}`}
                                >
                                    {d} días
                                </button>
                            ))}
                        </div>
                        <Select.Root value={filters.sucursal ? String(filters.sucursal) : "all"} onValueChange={(v) => go({ sucursal: v === "all" ? null : Number(v) })}>
                            <Select.Trigger aria-label="Sucursal" />
                            <Select.Content>
                                <Select.Item value="all">Todas las sucursales</Select.Item>
                                {allBranches.map((b) => (
                                    <Select.Item key={b.id} value={String(b.id)}>
                                        {b.name}
                                    </Select.Item>
                                ))}
                            </Select.Content>
                        </Select.Root>
                    </>
                }
            />

            <div className="grid grid-cols-2 gap-3 mb-4 lg:grid-cols-5">
                <StatTile label="Ventas en caja" value={number(kpis.caja_count)} change={change(kpis.caja_count, kpis.caja_count_prev)} />
                <StatTile label="Vendido en caja" value={formatCurrency(kpis.caja_amount)} change={change(kpis.caja_amount, kpis.caja_amount_prev)} />
                <StatTile
                    label="Adopción de la caja"
                    value={pct(kpis.adoption)}
                    hint={totalSales > 0 ? `${number(kpis.caja_count)} de ${number(totalSales)} ventas · ${pct(kpis.adoption_amount)} del monto` : "sin ventas en el periodo"}
                />
                <StatTile label="Ticket promedio" value={formatCurrency(kpis.avg_ticket)} hint="ventas de caja" />
                <StatTile label="Vendedores en caja" value={number(kpis.sellers)} hint={`${kpis.days_with_caja} de ${period.days} días con ventas en caja`} />
            </div>

            <SectionCard
                title="Ventas por día"
                subtitle="Número de ventas, sin canceladas. Lo ideal es que la barra azul (caja) vaya reemplazando a la naranja (notas a mano)."
                actions={<Legend series={SALES_SERIES} />}
                className="mb-4"
            >
                <ColumnChart data={daily} series={SALES_SERIES} valueFormat="count" />
            </SectionCard>

            <SectionCard title="Funciones de la caja" subtitle="Cuántas veces se usó cada función en el periodo." className="mb-4">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <Feature icon={<LuHandCoins />} label="Ventas a crédito" value={features.credit} hint="el cliente dejó a cuenta o nada" />
                    <Feature icon={<LuCoins />} label="Abonos cobrados" value={features.collections} hint="pagos de saldo hechos otro día" />
                    <Feature icon={<LuTruck />} label="Ventas con flete" value={features.flete} hint="flete cobrado en caja" />
                    <Feature icon={<LuPencilLine />} label="Precio o importe cambiado" value={features.price_changed} hint="ventas con algún precio distinto al del catálogo" />
                    <Feature icon={<LuBan />} label="Ventas canceladas" value={features.canceled} hint="desde Mis ventas, con motivo" />
                    <Feature icon={<LuPrinter />} label="Tickets impresos" value={features.tickets} hint={`${number(features.reprints)} reimpresiones`} />
                    <Feature icon={<LuReceipt />} label="Cortes del día" value={features.cortes} hint="cortes guardados" />
                    <Feature icon={<LuPackagePlus />} label="Notas de entrada" value={features.entries} hint="compras a proveedores capturadas" />
                    <Feature icon={<LuRepeat />} label="Notas a mano" value={kpis.manual_count} hint={`${formatCurrency(kpis.manual_amount)} fuera de la caja`} />
                </div>
            </SectionCard>

            <div className="grid gap-4 mb-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <SectionCard title="Por sucursal" subtitle="Qué parte de las ventas pasó por la caja y si se hace el corte.">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-xs text-left border-b text-fog border-ash">
                                    <th className="py-2 pr-3 font-medium">Sucursal</th>
                                    <th className="py-2 pr-3 font-medium text-right">Caja</th>
                                    <th className="py-2 pr-3 font-medium text-right">A mano</th>
                                    <th className="py-2 pr-3 font-medium">Adopción</th>
                                    <th className="py-2 font-medium text-right" title="Cortes guardados / días con ventas">
                                        Cortes
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="tabular-nums">
                                {branches.map((b) => (
                                    <tr key={b.id} className="border-b border-ash/70 last:border-0">
                                        <td className="py-2 pr-3 text-charcoal">{b.name}</td>
                                        <td className="py-2 pr-3 text-right">
                                            <div className="text-charcoal">{number(b.caja_count)}</div>
                                            <div className="text-xs text-fog">{formatCurrency(b.caja_amount)}</div>
                                        </td>
                                        <td className="py-2 pr-3 text-right text-steel">{number(b.manual_count)}</td>
                                        <td className="py-2 pr-3 min-w-[120px]">
                                            <AdoptionBar value={b.adoption} />
                                        </td>
                                        <td className={`py-2 text-right ${b.days_with_sales > 0 && b.cortes < b.days_with_sales ? "text-amber-800" : "text-steel"}`}>
                                            {b.cortes} / {b.days_with_sales}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </SectionCard>

                <SectionCard title="Horas pico" subtitle="Ventas de caja por hora del día.">
                    {hours.length === 0 ? (
                        <p className="py-8 text-sm text-center text-fog">Sin ventas de caja en el periodo.</p>
                    ) : (
                        <div className="flex items-end gap-1 h-44" role="img" aria-label="Ventas de caja por hora">
                            {hours.map((h) => (
                                <div key={h.hour} className="flex flex-col items-center justify-end flex-1 h-full gap-1" title={`${h.hour}:00 – ${h.count} ventas`}>
                                    <span className="text-[10px] tabular-nums text-fog">{h.count > 0 ? h.count : ""}</span>
                                    <div
                                        className="w-full max-w-[28px] rounded-t"
                                        style={{ height: `${peak > 0 ? (h.count / peak) * 100 : 0}%`, minHeight: h.count > 0 ? 3 : 0, background: SERIES.blue }}
                                    />
                                    <span className="text-[10px] tabular-nums text-fog">{h.hour}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </SectionCard>
            </div>

            <SectionCard title="Por usuario" subtitle="Quién vende en caja, quién sigue capturando notas a mano y cuándo entró por última vez.">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[760px]">
                        <thead>
                            <tr className="text-xs text-left border-b text-fog border-ash">
                                <th className="py-2 pr-3 font-medium">Usuario</th>
                                <th className="py-2 pr-3 font-medium text-right">Ventas en caja</th>
                                <th className="py-2 pr-3 font-medium text-right">Notas a mano</th>
                                <th className="py-2 pr-3 font-medium text-right">Canceladas</th>
                                <th className="py-2 pr-3 font-medium text-right">Tickets</th>
                                <th className="py-2 pr-3 font-medium">Última venta en caja</th>
                                <th className="py-2 font-medium" title={activityTracked ? "Última vez que usó el sistema" : "Sólo con sesiones en base de datos (SESSION_DRIVER=database)"}>
                                    Última actividad
                                </th>
                            </tr>
                        </thead>
                        <tbody className="tabular-nums">
                            {users.map((u) => (
                                <tr key={u.id} className={`border-b border-ash/70 last:border-0 ${u.active ? "" : "opacity-60"}`}>
                                    <td className="py-2 pr-3">
                                        <div className="flex items-center gap-2 text-charcoal">
                                            {u.name}
                                            <Badge color={u.role === "cashier" ? "blue" : "gray"} variant="soft" size="1">
                                                {u.role === "cashier" ? "Cajero" : u.role === "owner" ? "Dueño" : "Super admin"}
                                            </Badge>
                                            {!u.active && (
                                                <Badge color="red" variant="soft" size="1">
                                                    Inactivo
                                                </Badge>
                                            )}
                                        </div>
                                        {u.branches.length > 0 && <div className="text-xs text-fog">{u.branches.join(", ")}</div>}
                                    </td>
                                    <td className="py-2 pr-3 text-right">
                                        <div className="text-charcoal">{number(u.caja_count)}</div>
                                        {u.caja_amount > 0 && <div className="text-xs text-fog">{formatCurrency(u.caja_amount)}</div>}
                                    </td>
                                    <td className="py-2 pr-3 text-right text-steel">{number(u.manual_count)}</td>
                                    <td className="py-2 pr-3 text-right text-steel">{number(u.canceled)}</td>
                                    <td className="py-2 pr-3 text-right text-steel">{number(u.tickets)}</td>
                                    <td className="py-2 pr-3 text-steel">{ago(u.last_sale)}</td>
                                    <td className="py-2 text-steel">{activityTracked ? ago(u.last_activity) : "—"}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </SectionCard>
        </Container>
    );
};

export default UsageIndex;
