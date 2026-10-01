import Container from "@/Components/Container";
import Pagination from "@/Components/Pagination";
import { DropdownFilter } from "@/Components/ProductsModal/DropdownFilter/DropdownFilter";
import PageHeader from "@/Components/ui/PageHeader";
import { formatCurrency } from "@/helpers/formatters";
import useAlerts from "@/hooks/useAlerts";
import { PageProps } from "@/types";
import { Corte } from "@/types/Corte";
import { router } from "@inertiajs/react";
import { Button, Table } from "@radix-ui/themes";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { LuCalendar, LuCalendarRange, LuPlus } from "react-icons/lu";
import { useLocalStorage } from "usehooks-ts";

interface CortesProps extends PageProps {
    branch: Branch;
    pagination: any;
    month: string;
    year: string;
    branches: Branch[];
}

// Mismos valores que entiende CorteController@index (?filter=); sin parámetro = este mes.
const PERIODS = {
    THIS_MONTH: "Este mes",
    LAST_MONTH: "Mes anterior",
    THIS_YEAR: "Este año",
    LAST_YEAR: "Año anterior",
    ALL_TIME: "Todo el tiempo",
};

const longDate = (date: string) => {
    const text = format(parseISO(date), "EEEE d 'de' MMMM yyyy", { locale: es });
    return text.charAt(0).toUpperCase() + text.slice(1);
};

const CortesIndex = ({ branch, pagination, flash }: CortesProps) => {
    const cortes: Corte[] = pagination.data;

    useAlerts(flash);

    const [filterDate] = useLocalStorage(`date-filter-${branch.id}`, "THIS_WEEK");

    const totals = cortes.reduce(
        (acc, c) => ({
            sale: acc.sale + Number(c.sale_total ?? 0),
            cash: acc.cash + Number(c.cash_total ?? 0),
            expenses: acc.expenses + Number(c.expenses_total ?? 0),
        }),
        { sale: 0, cash: 0, expenses: 0 }
    );

    return (
        <Container headTitle="Cortes">
            <div style={{ minHeight: "calc(100vh - 130px)" }}>
                <PageHeader
                    back={{ label: "Notas", href: route("notas", { date: filterDate }) }}
                    eyebrow={branch.name}
                    title="Cortes"
                    description={`${pagination.total} ${pagination.total === 1 ? "corte guardado" : "cortes guardados"}`}
                    actions={
                        <>
                            <Button variant="outline" color="gray" onClick={() => router.visit(route("cortes_semanales.create"))}>
                                <LuCalendarRange />
                                Corte semanal
                            </Button>
                            <Button onClick={() => router.visit(route("cortes.new"))}>
                                <LuPlus />
                                Crear un corte
                            </Button>
                        </>
                    }
                />

                <div className="flex flex-wrap items-center gap-2 mb-4">
                    <DropdownFilter
                        icon={<LuCalendar />}
                        values={PERIODS}
                        paramKey="filter"
                        defaultLabel="Periodo"
                        defaultValue="THIS_MONTH"
                        routeName="cortes"
                        resetPage
                    />
                </div>

                <div className="overflow-x-auto border border-ash rounded-card">
                    <Table.Root>
                        <Table.Header>
                            <Table.Row>
                                <Table.ColumnHeaderCell width="80px">Corte</Table.ColumnHeaderCell>
                                <Table.ColumnHeaderCell>Fecha</Table.ColumnHeaderCell>
                                <Table.ColumnHeaderCell justify="end">Venta total</Table.ColumnHeaderCell>
                                <Table.ColumnHeaderCell justify="end">Efectivo</Table.ColumnHeaderCell>
                                <Table.ColumnHeaderCell justify="end">Gastos</Table.ColumnHeaderCell>
                            </Table.Row>
                        </Table.Header>
                        <Table.Body>
                            {cortes.map((corte) => (
                                <Table.Row
                                    key={corte.id}
                                    align="center"
                                    className="cursor-pointer"
                                    onClick={() => router.visit(route("cortes.show", corte.id))}
                                >
                                    <Table.Cell className="tabular-nums text-fog">#{corte.id}</Table.Cell>
                                    <Table.Cell className="font-medium text-charcoal">{longDate(corte.date)}</Table.Cell>
                                    <Table.Cell justify="end" className="font-semibold tabular-nums">
                                        {formatCurrency(corte.sale_total)}
                                    </Table.Cell>
                                    <Table.Cell justify="end" className={`tabular-nums ${Number(corte.cash_total) < 0 ? "text-[#d03b3b]" : ""}`}>
                                        {formatCurrency(corte.cash_total)}
                                    </Table.Cell>
                                    <Table.Cell justify="end" className="tabular-nums text-steel">
                                        {formatCurrency(corte.expenses_total)}
                                    </Table.Cell>
                                </Table.Row>
                            ))}
                            {cortes.length > 0 && (
                                <Table.Row className="bg-[#fafafa]">
                                    <Table.Cell />
                                    <Table.Cell className="font-semibold">Total de esta página</Table.Cell>
                                    <Table.Cell justify="end" className="font-semibold tabular-nums">{formatCurrency(totals.sale)}</Table.Cell>
                                    <Table.Cell justify="end" className="font-semibold tabular-nums">{formatCurrency(totals.cash)}</Table.Cell>
                                    <Table.Cell justify="end" className="font-semibold tabular-nums">{formatCurrency(totals.expenses)}</Table.Cell>
                                </Table.Row>
                            )}
                        </Table.Body>
                    </Table.Root>

                    {cortes.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <p className="text-base font-medium text-charcoal">No hay cortes en este periodo</p>
                            <button
                                type="button"
                                onClick={() => router.visit(route("cortes.new"))}
                                className="mt-2 text-sm font-medium text-electric hover:underline"
                            >
                                Crear el corte de hoy
                            </button>
                        </div>
                    )}
                </div>

                <Pagination pagination={pagination} />
            </div>
        </Container>
    );
};

export default CortesIndex;
