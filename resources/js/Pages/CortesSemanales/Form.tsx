import Container from "@/Components/Container";
import MoneyInput from "@/Components/MoneyInput";
import SectionCard from "@/Components/SectionCard";
import PageHeader from "@/Components/ui/PageHeader";

import useAlerts from "@/hooks/useAlerts";
import { PageProps } from "@/types";

import { router } from "@inertiajs/react";
import { Button, Flex, IconButton, Text } from "@radix-ui/themes";
import { BiChevronLeft, BiChevronRight, BiTrash } from "react-icons/bi";

import { confirmAlert } from "react-confirm-alert";

import { CorteSemanal } from "@/types/CorteSemanal";
import { FaFileExcel } from "react-icons/fa6";
import { ReactNode, useEffect, useMemo, useState } from "react";
import Datepicker, { DateValueType } from "react-tailwindcss-datepicker";
import { Corte } from "@/types/Corte";
import { formatCurrency } from "@/helpers/formatters";
import dayjs from "dayjs";

import { isNumber } from "@/helpers/utils";
import { BsEye } from "react-icons/bs";
import { toast } from "react-toastify";

interface Props extends PageProps {
    branch: Branch;
    corteSemanal?: CorteSemanal;
    date_range: {
        start: string;
        end: string;
    };
    initial_start: Date;
    initial_end: Date;
    cortes: Corte[];
}

function formatDate(date: string) {
    const options: Intl.DateTimeFormatOptions = {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
    };
    const dateObj = new Date(date + "T00:00");
    const formattedDate = dateObj.toLocaleDateString("es-ES", options);

    return formattedDate.toUpperCase();
}

function getMonthNameInSpanish(monthIndex: number) {
    const months = [
        "ENERO",
        "FEBRERO",
        "MARZO",
        "ABRIL",
        "MAYO",
        "JUNIO",
        "JULIO",
        "AGOSTO",
        "SEPTIEMBRE",
        "OCTUBRE",
        "NOVIEMBRE",
        "DICIEMBRE",
    ];
    return months[monthIndex];
}

function calculateTotal<T extends Record<string, any>>(
    items: T[],
    field: keyof T
): number {
    const sum = items.reduce((total, item) => {
        const value = isNumber(Number(item[field])) ? Number(item[field]) : 0;
        return total + (typeof value === "number" ? value : 0);
    }, 0);

    //round
    return Math.round(sum * 100) / 100;
}

const SummaryValue = ({ label, value, hint }: { label: string; value: number; hint?: string }) => (
    <div className="p-3 border border-ash rounded-card">
        <div className="text-xs font-medium tracking-wide text-fog uppercase">{label}</div>
        <div className="mt-1 text-lg font-semibold text-charcoal whitespace-nowrap tabular-nums">{formatCurrency(value)}</div>
        {hint && <div className="text-xs text-fog">{hint}</div>}
    </div>
);

const FieldRow = ({ label, children }: { label: string; children: ReactNode }) => (
    <label className="flex items-center justify-between gap-3 text-sm">
        <span className="text-graphite">{label}</span>
        <span className="w-36 shrink-0">{children}</span>
    </label>
);

const FormulaRow = ({ label, value, sign, strong = false }: { label: string; value: number; sign?: string; strong?: boolean }) => (
    <div className={`flex justify-between text-sm tabular-nums ${strong ? "font-semibold text-charcoal" : "text-graphite"}`}>
        <span>
            {sign && <span className="inline-block w-4 text-silver">{sign}</span>}
            {label}
        </span>
        <span className={value < 0 ? "text-[#d03b3b]" : ""}>{formatCurrency(value)}</span>
    </div>
);

const cleanNumber = (value: string | number) => {
    if (typeof value === "number") {
        return value;
    }
    const cleanedValue = value.replace(/[^0-9.-]+/g, "");
    return isNaN(Number(cleanedValue)) ? 0 : Number(cleanedValue);
};

const CorteSemanalForm = ({
    flash,
    corteSemanal,
    branch,
    initial_start,
    initial_end,
    cortes,
}: Props) => {
    useAlerts(flash);

    const [cortesWithTotals, setCortesWithTotals] = useState(() => {
        return cortes.map((corte) => ({
            ...corte,
            balance_total: calculateTotal(corte.notes, "balance"),
            material_total: calculateTotal(corte.notes, "purchase_total") as
                | number
                | string,
            date: formatDate(corte.date),
        }));
    });

    const isDetail = !!corteSemanal;

    const [value, setValue] = useState<DateValueType>({
        startDate: initial_start,
        endDate: initial_end,
    });

    const totals = useMemo(
        () => ({
            sale_total: calculateTotal(cortesWithTotals, "sale_total"),
            balance_total: calculateTotal(cortesWithTotals, "balance_total"),
            transfer_total: calculateTotal(cortesWithTotals, "transfer_total"),
            previous_notes_total: calculateTotal(
                cortesWithTotals,
                "previous_notes_total"
            ),
            expenses_total: calculateTotal(cortesWithTotals, "expenses_total"),
            cash_total: calculateTotal(cortesWithTotals, "cash_total"),
            material_total: calculateTotal(cortesWithTotals, "material_total"),
        }),
        [cortesWithTotals]
    );

    const [salary, setSalary] = useState("4800");

    //gasolina,luz, renta,
    const [expenses, setExpenses] = useState<{
        gasolina: string;
        luz: string;
        renta: string;
    }>({
        gasolina: "0",
        luz: "0",
        renta: "0",
    });

    const [extraExpenses, setExtraExpenses] = useState("0");

    const fiftyPercent = useMemo(() => {
        return (
            (totals.sale_total -
                (cleanNumber(salary) ?? 0) -
                (cleanNumber(totals.material_total) ?? 0) -
                (cleanNumber(extraExpenses) ?? 0)) *
            0.5
        );
    }, [totals, salary, extraExpenses]);

    const handleChange = (newValue: any) => {
        setValue(newValue);

        const start_date = newValue.startDate;
        const end_date = newValue.endDate;

        if (start_date && end_date) {
            const formattedStart = start_date.toISOString().split("T")[0];
            const formattedEnd = end_date.toISOString().split("T")[0];

            router.get(route("cortes_semanales.create"), {
                start_date: formattedStart,
                end_date: formattedEnd,
            });
        }
    };

    const getTitle = () => {
        const day = dayjs(value?.startDate).format("DD");
        const day2 = dayjs(value?.endDate).format("DD");

        const year = dayjs(value?.startDate).format("YYYY");

        const spanishMonth = getMonthNameInSpanish(
            dayjs(value?.endDate).month()
        );

        const isDifferentMonth =
            dayjs(value?.startDate).month() !== dayjs(value?.endDate).month();

        const startMonth = getMonthNameInSpanish(
            dayjs(value?.startDate).month()
        );

        return `Semana del ${day} ${
            isDifferentMonth ? `de ${startMonth}` : ""
        } al ${day2} de ${spanishMonth} de ${year}`.toUpperCase();
    };

    const handleSubmitData = async () => {
        const title = getTitle();
        const data = {
            title: title,
            ...Object.fromEntries(
                Object.entries(totals).map(([k, v]) => [k, String(v ?? "")])
            ),
            renta: cleanNumber(expenses.renta).toString(),
            gasolina: cleanNumber(expenses.gasolina).toString(),
            luz: cleanNumber(expenses.luz).toString(),
            salary: String(cleanNumber(salary)),
            extra_expenses: String(cleanNumber(extraExpenses)),
            material: String(totals.material_total),
            branch_id: String(branch.id),
            percent: String(fiftyPercent),
            cortes: JSON.stringify(cortesWithTotals),
        };

        const response = await fetch(route("cortes_semanales.export"), {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                // La ruta ya va con sesión (routes/web.php): requiere el token CSRF.
                "X-XSRF-TOKEN": decodeURIComponent(document.cookie.match(/(?:^|; )XSRF-TOKEN=([^;]*)/)?.[1] ?? ""),
            },
            body: JSON.stringify(data),
        });

        const fileName = `corte_semanal_${title}.xlsx`
            .replace(/\s+/g, "_")
            .toLowerCase();
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    useEffect(() => {
        const gasolina = cleanNumber(expenses.gasolina);
        const luz = cleanNumber(expenses.luz);
        const renta = cleanNumber(expenses.renta);
        const totalExpenses = gasolina + luz + renta;
        setExtraExpenses(totalExpenses.toString());
    }, [expenses]);

    const [exporting, setExporting] = useState(false);
    const exportExcel = async () => {
        setExporting(true);
        try {
            await handleSubmitData();
        } catch {
            toast.error("No se pudo generar el Excel");
        } finally {
            setExporting(false);
        }
    };

    const shiftWeek = (days: number) => {
        const start = dayjs(value?.startDate).add(days, "day").format("YYYY-MM-DD");
        const end = dayjs(value?.endDate).add(days, "day").format("YYYY-MM-DD");
        router.get(route("cortes_semanales.create"), { start_date: start, end_date: end });
    };

    // getTitle() se queda en mayúsculas para el Excel; en pantalla, tipo oración.
    const displayTitle = (() => {
        const t = getTitle().replace(/\s+/g, " ").toLowerCase();
        return t.charAt(0).toUpperCase() + t.slice(1);
    })();

    const salaryValue = cleanNumber(salary) ?? 0;
    const materialValue = cleanNumber(totals.material_total) ?? 0;
    const extraValue = cleanNumber(extraExpenses) ?? 0;

    const confirmDelete = () => {
        confirmAlert({
            title: "Eliminar corte",
            message: "¿Estás seguro de eliminar este corte?",
            buttons: [
                {
                    label: "Sí",
                    onClick: () => router.delete(route("cortes_semanales.destroy", { corte: corteSemanal!.id })),
                },
                { label: "No" },
            ],
        });
    };

    return (
        <Container headTitle={"Corte semanal"}>
            <div style={{ minHeight: "calc(100vh - 130px)" }}>
                <PageHeader
                    eyebrow={branch.name}
                    title="Corte semanal"
                    description={displayTitle}
                    actions={
                        <>
                            {isDetail && (
                                <Button color="red" variant="soft" onClick={confirmDelete}>
                                    <BiTrash />
                                    Eliminar
                                </Button>
                            )}
                            <Button disabled={exporting} onClick={exportExcel}>
                                <FaFileExcel />
                                {exporting ? "Generando..." : "Descargar Excel"}
                            </Button>
                        </>
                    }
                />

                <div className="flex items-center gap-2 mb-5">
                    <IconButton
                        variant="outline"
                        color="gray"
                        className="shrink-0"
                        aria-label="Semana anterior"
                        title="Semana anterior"
                        onClick={() => shiftWeek(-7)}
                    >
                        <BiChevronLeft />
                    </IconButton>
                    <div className="flex-1 max-w-md">
                        <Datepicker
                            value={value}
                            onChange={handleChange}
                            displayFormat="DD/MM/YYYY"
                            primaryColor="blue"
                            showShortcuts={false}
                            configs={{}}
                        />
                    </div>
                    <IconButton
                        variant="outline"
                        color="gray"
                        className="shrink-0"
                        aria-label="Semana siguiente"
                        title="Semana siguiente"
                        onClick={() => shiftWeek(7)}
                    >
                        <BiChevronRight />
                    </IconButton>
                </div>

                <div className="grid grid-cols-1 gap-4 mb-4 lg:grid-cols-3">
                    <SectionCard
                        title="Resumen de la semana"
                        subtitle={`Suma de ${cortesWithTotals.length} ${cortesWithTotals.length === 1 ? "corte guardado" : "cortes guardados"}`}
                        className="lg:col-span-2"
                    >
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
                            <SummaryValue label="Venta total" value={totals.sale_total} />
                            <SummaryValue label="Restan notas" value={totals.balance_total} />
                            <SummaryValue label="Transferencias" value={totals.transfer_total} />
                            <SummaryValue label="Entradas" value={totals.previous_notes_total} />
                            <SummaryValue label="Gastos" value={totals.expenses_total} />
                            <SummaryValue label="Efectivo" value={totals.cash_total} />
                            <SummaryValue label="Material" value={materialValue} hint="Suma de la columna Material" />
                        </div>
                    </SectionCard>

                    <SectionCard title="Cálculo del 50%" subtitle="Captura sueldos y gastos extra">
                        <div className="space-y-2">
                            <FieldRow label="Sueldos">
                                <MoneyInput value={salary} onChange={setSalary} aria-label="Sueldos" />
                            </FieldRow>
                            <p className="pt-2 text-xs font-medium tracking-wide text-fog uppercase">Gastos extra</p>
                            <FieldRow label="Gasolina chofer casetas">
                                <MoneyInput value={expenses.gasolina} onChange={(v) => setExpenses({ ...expenses, gasolina: v })} aria-label="Gasolina chofer casetas" />
                            </FieldRow>
                            <FieldRow label="Luz">
                                <MoneyInput value={expenses.luz} onChange={(v) => setExpenses({ ...expenses, luz: v })} aria-label="Luz" />
                            </FieldRow>
                            <FieldRow label="Renta">
                                <MoneyInput value={expenses.renta} onChange={(v) => setExpenses({ ...expenses, renta: v })} aria-label="Renta" />
                            </FieldRow>
                        </div>

                        <div className="pt-3 mt-4 space-y-1 border-t border-ash">
                            <FormulaRow label="Venta total" value={totals.sale_total} />
                            <FormulaRow sign="−" label="Sueldos" value={salaryValue} />
                            <FormulaRow sign="−" label="Material" value={materialValue} />
                            <FormulaRow sign="−" label="Gastos extra" value={extraValue} />
                            <div className="pt-2 mt-2 border-t border-ash">
                                <div className="flex items-baseline justify-between">
                                    <span className="text-sm font-semibold text-charcoal">50%</span>
                                    <span className={`text-2xl font-semibold tabular-nums ${fiftyPercent < 0 ? "text-[#d03b3b]" : "text-electric"}`}>
                                        {formatCurrency(fiftyPercent)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </SectionCard>
                </div>

                <SectionCard
                    title="Cortes de la semana"
                    subtitle="Puedes ajustar el material de cada día; el total y el 50% se recalculan"
                >
                    {cortesWithTotals.length === 0 ? (
                        <div className="py-8 text-sm text-center text-fog">
                            No hay cortes guardados en esta semana.{" "}
                            <button
                                type="button"
                                className="font-medium text-electric hover:underline"
                                onClick={() => router.visit(route("cortes.new"))}
                            >
                                Generar corte del día
                            </button>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-xs text-left text-fog uppercase border-b border-ash">
                                        <th className="py-2 pr-3 font-medium">Fecha</th>
                                        <th className="py-2 pr-3 font-medium text-right">Venta</th>
                                        <th className="py-2 pr-3 font-medium text-right">Resta</th>
                                        <th className="py-2 pr-3 font-medium text-right">Transferencias</th>
                                        <th className="py-2 pr-3 font-medium text-right">Entradas</th>
                                        <th className="py-2 pr-3 font-medium text-right">Gastos</th>
                                        <th className="py-2 pr-3 font-medium text-right">Efectivo</th>
                                        <th className="py-2 pr-3 font-medium text-right">Material</th>
                                        <th className="w-10 py-2" aria-label="Ver corte" />
                                    </tr>
                                </thead>
                                <tbody className="tabular-nums">
                                    {cortesWithTotals.map((corte) => (
                                        <tr key={corte.id} className="border-b border-ash">
                                            <td className="py-2 pr-3 font-medium whitespace-nowrap">{corte.date}</td>
                                            <td className="py-2 pr-3 text-right">{formatCurrency(corte.sale_total)}</td>
                                            <td className="py-2 pr-3 text-right">{formatCurrency(corte.balance_total)}</td>
                                            <td className="py-2 pr-3 text-right">{formatCurrency(corte.transfer_total)}</td>
                                            <td className="py-2 pr-3 text-right">{formatCurrency(corte.previous_notes_total)}</td>
                                            <td className="py-2 pr-3 text-right">{formatCurrency(corte.expenses_total)}</td>
                                            <td className="py-2 pr-3 text-right">{formatCurrency(corte.cash_total)}</td>
                                            <td className="py-1.5 pr-3 w-36">
                                                <MoneyInput
                                                    compact
                                                    id={`material-${corte.id}`}
                                                    aria-label={`Material ${corte.date}`}
                                                    value={corte.material_total}
                                                    onChange={(newValue) =>
                                                        setCortesWithTotals(
                                                            cortesWithTotals.map((c) =>
                                                                c.id === corte.id ? { ...c, material_total: newValue } : c
                                                            )
                                                        )
                                                    }
                                                />
                                            </td>
                                            <td className="py-2 text-center">
                                                <IconButton
                                                    variant="ghost"
                                                    className="hover:cursor-pointer"
                                                    size="1"
                                                    aria-label={`Ver corte del ${corte.date}`}
                                                    title="Ver corte"
                                                    onClick={() => window.open(route("cortes.show", corte.id), "_blank")}
                                                >
                                                    <BsEye />
                                                </IconButton>
                                            </td>
                                        </tr>
                                    ))}
                                    <tr className="font-semibold text-charcoal border-t-2 border-ash">
                                        <td className="py-2 pr-3">Total</td>
                                        {(["sale_total", "balance_total", "transfer_total", "previous_notes_total", "expenses_total", "cash_total", "material_total"] as const).map((key) => (
                                            <td key={key} className={`py-2 pr-3 text-right ${key === "material_total" ? "pr-5" : ""}`}>
                                                {formatCurrency(calculateTotal(cortesWithTotals, key))}
                                            </td>
                                        ))}
                                        <td />
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    )}
                </SectionCard>
            </div>
        </Container>
    );
};

export default CorteSemanalForm;
