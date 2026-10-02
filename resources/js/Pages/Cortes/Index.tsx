import Container from "@/Components/Container";
import Pagination from "@/Components/Pagination";
import PageHeader from "@/Components/ui/PageHeader";
import { formatCurrency } from "@/helpers/formatters";
import useAlerts from "@/hooks/useAlerts";
import { useCan } from "@/hooks/useCan";
import { PageProps } from "@/types";
import { Corte } from "@/types/Corte";
import { router } from "@inertiajs/react";
import { Button, SegmentedControl } from "@radix-ui/themes";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { LuCalendarCheck, LuCalendarClock, LuCalendarRange, LuFileDown, LuPlus, LuTriangleAlert } from "react-icons/lu";
import { useLocalStorage } from "usehooks-ts";

interface Totals {
    count: number;
    sale: number;
    cash: number;
    card: number;
    transfer: number;
    expenses: number;
}

interface CortesProps extends PageProps {
    branch: Branch;
    pagination: any;
    filter: string;
    totals: Totals;
    repeatedDates: string[];
    today: string;
    todayCorteId: number | null;
}

// Mismos valores que entiende CorteController@index (?filter=).
const PERIODS: Record<string, string> = {
    THIS_MONTH: "Este mes",
    LAST_MONTH: "Mes anterior",
    THIS_YEAR: "Este año",
    ALL_TIME: "Todo",
};

const day = (date: string) => parseISO(date.slice(0, 10));
const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

const Stat = ({ label, value, emphasis = false, tone }: { label: string; value: number; emphasis?: boolean; tone?: "negative" }) => (
    <div className={`p-3 border rounded-card ${emphasis ? "bg-sky-tint border-transparent" : "bg-white border-ash"}`}>
        <div className="text-xs font-medium text-steel">{label}</div>
        <div className={`mt-0.5 font-semibold tabular-nums ${emphasis ? "text-xl text-sapphire" : "text-lg"} ${tone === "negative" ? "text-[#d03b3b]" : "text-charcoal"}`}>
            {formatCurrency(value)}
        </div>
    </div>
);

const CortesIndex = ({ branch, pagination, filter, totals, repeatedDates, today, todayCorteId, flash }: CortesProps) => {
    useAlerts(flash);
    const can = useCan();
    const cortes: Corte[] = pagination.data;
    const [notesFilter] = useLocalStorage(`date-filter-${branch.id}`, "THIS_WEEK");
    const repeated = new Set(repeatedDates);

    const setPeriod = (value: string) => router.get(route("cortes"), value === "THIS_MONTH" ? {} : { filter: value }, { preserveScroll: true });
    const pdf = (id: number) => (window.location.href = route("cortes.export", { corte: id }));

    return (
        <Container headTitle="Cortes">
            <PageHeader
                // El cajero no tiene Notas: regresa a su caja.
                back={can("notes.view") ? { label: "Notas", href: route("notas", { date: notesFilter }) } : { label: "Caja", href: route("caja") }}
                eyebrow={branch.name}
                title="Cortes"
                description={`${totals.count} ${totals.count === 1 ? "corte" : "cortes"} en ${PERIODS[filter]?.toLowerCase() ?? "el periodo"}`}
                actions={
                    can("cortes.manage") && (
                        <Button variant="outline" color="gray" onClick={() => router.visit(route("cortes_semanales.create"))}>
                            <LuCalendarRange />
                            Corte semanal
                        </Button>
                    )
                }
            />

            {/* El corte de hoy: lo primero que se busca en esta pantalla. */}
            <div
                className={`flex flex-wrap items-center justify-between gap-3 p-4 mb-5 border rounded-card ${
                    todayCorteId ? "bg-mint border-transparent" : "bg-white border-ash"
                }`}
            >
                <div className="flex items-center gap-3">
                    <span
                        className={`flex items-center justify-center w-10 h-10 rounded-tag ${todayCorteId ? "bg-white text-green-700" : "bg-sky-tint text-electric"}`}
                    >
                        {todayCorteId ? <LuCalendarCheck className="w-5 h-5" /> : <LuCalendarClock className="w-5 h-5" />}
                    </span>
                    <div>
                        <div className="font-medium text-charcoal">
                            {todayCorteId ? "El corte de hoy ya está guardado" : "Todavía no se hace el corte de hoy"}
                        </div>
                        <div className="text-sm text-steel">{capitalize(format(day(today), "EEEE d 'de' MMMM", { locale: es }))}</div>
                    </div>
                </div>
                {todayCorteId ? (
                    <Button variant="soft" color="green" onClick={() => router.visit(route("cortes.show", todayCorteId))}>
                        Ver el corte de hoy
                    </Button>
                ) : (
                    <Button onClick={() => router.visit(route("cortes.new"))}>
                        <LuPlus />
                        Hacer el corte de hoy
                    </Button>
                )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <SegmentedControl.Root value={PERIODS[filter] ? filter : "THIS_MONTH"} onValueChange={setPeriod}>
                    {Object.entries(PERIODS).map(([value, label]) => (
                        <SegmentedControl.Item key={value} value={value}>
                            {label}
                        </SegmentedControl.Item>
                    ))}
                </SegmentedControl.Root>
                {todayCorteId && (
                    <Button variant="outline" color="gray" onClick={() => router.visit(route("cortes.new"))}>
                        <LuPlus />
                        Otro corte
                    </Button>
                )}
            </div>

            <div className="grid grid-cols-2 gap-2 mb-5 sm:grid-cols-3 lg:grid-cols-5">
                <Stat label="Venta" value={totals.sale} emphasis />
                <Stat label="Efectivo" value={totals.cash} tone={totals.cash < 0 ? "negative" : undefined} />
                <Stat label="Tarjeta" value={totals.card} />
                <Stat label="Transferencia" value={totals.transfer} />
                <Stat label="Gastos" value={totals.expenses} />
            </div>

            {cortes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center border border-ash rounded-card">
                    <p className="font-medium text-charcoal">No hay cortes en este periodo</p>
                    <p className="mt-1 text-sm text-fog">Prueba con otro periodo o haz el corte de hoy.</p>
                </div>
            ) : (
                <>
                    {/* Escritorio */}
                    <div className="hidden overflow-hidden border md:block border-ash rounded-card">
                        <table className="w-full text-sm">
                            <thead className="text-xs text-left border-b text-fog border-ash bg-paper">
                                <tr>
                                    <th className="px-4 py-2.5 font-medium">Fecha</th>
                                    <th className="px-4 py-2.5 font-medium text-right">Venta</th>
                                    <th className="px-4 py-2.5 font-medium text-right">Efectivo</th>
                                    <th className="px-4 py-2.5 font-medium text-right">Tarjeta</th>
                                    <th className="px-4 py-2.5 font-medium text-right">Transferencia</th>
                                    <th className="px-4 py-2.5 font-medium text-right">Gastos</th>
                                    <th className="px-4 py-2.5" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-ash tabular-nums">
                                {cortes.map((c) => (
                                    <tr key={c.id} onClick={() => router.visit(route("cortes.show", c.id))} className="cursor-pointer hover:bg-paper/60">
                                        <td className="px-4 py-3">
                                            <div className="font-medium text-charcoal">{capitalize(format(day(c.date), "EEEE d 'de' MMMM", { locale: es }))}</div>
                                            <div className="flex items-center gap-2 text-xs text-fog">
                                                Corte #{c.id}
                                                {repeated.has(c.date.slice(0, 10)) && (
                                                    <span className="inline-flex items-center gap-1 font-medium text-amber-700" title="Hay más de un corte de este día">
                                                        <LuTriangleAlert className="w-3 h-3" aria-hidden /> Repetido
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 font-semibold text-right text-charcoal">{formatCurrency(c.sale_total)}</td>
                                        <td className={`px-4 py-3 text-right ${Number(c.cash_total) < 0 ? "text-[#d03b3b]" : "text-charcoal"}`}>
                                            {formatCurrency(c.cash_total)}
                                        </td>
                                        <td className="px-4 py-3 text-right text-steel">{formatCurrency(c.card_total)}</td>
                                        <td className="px-4 py-3 text-right text-steel">{formatCurrency(c.transfer_total)}</td>
                                        <td className="px-4 py-3 text-right text-steel">{formatCurrency(c.expenses_total)}</td>
                                        <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                                            <Button size="1" variant="ghost" color="gray" onClick={() => pdf(c.id!)} aria-label={`PDF del corte ${c.id}`}>
                                                <LuFileDown /> PDF
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Celular */}
                    <ul className="space-y-2 md:hidden">
                        {cortes.map((c) => (
                            <li key={c.id}>
                                <button
                                    type="button"
                                    onClick={() => router.visit(route("cortes.show", c.id))}
                                    className="w-full p-3 text-left bg-white border border-ash rounded-card"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <div className="font-medium text-charcoal">{capitalize(format(day(c.date), "EEE d MMM", { locale: es }))}</div>
                                            <div className="text-xs text-fog">
                                                Corte #{c.id}
                                                {repeated.has(c.date.slice(0, 10)) && <span className="ml-2 font-medium text-amber-700">Repetido</span>}
                                            </div>
                                        </div>
                                        <div className="text-right tabular-nums">
                                            <div className="font-semibold text-charcoal">{formatCurrency(c.sale_total)}</div>
                                            <div className="text-xs text-steel">Efectivo {formatCurrency(c.cash_total)}</div>
                                        </div>
                                    </div>
                                </button>
                            </li>
                        ))}
                    </ul>

                    <Pagination pagination={pagination} />
                </>
            )}
        </Container>
    );
};

export default CortesIndex;
