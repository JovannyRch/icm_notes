import Container from "@/Components/Container";

import useAlerts from "@/hooks/useAlerts";
import { payment_status } from "@/types";
import { PageProps } from "@/types";
import { Branch } from "@/types/Branch";
import { NoteItemInterface } from "@/types/NoteItem";

import { router, useForm } from "@inertiajs/react";
import { Button, Flex, IconButton, Table, Text } from "@radix-ui/themes";
import { BiArrowBack, BiTrash } from "react-icons/bi";

import { Inertia } from "@inertiajs/inertia";
import { confirmAlert } from "react-confirm-alert";

import { CorteSemanal } from "@/types/CorteSemanal";
import { FaDownload, FaFileExcel } from "react-icons/fa6";
import { useEffect, useMemo, useState } from "react";
import Datepicker, { DateValueType } from "react-tailwindcss-datepicker";
import { Corte } from "@/types/Corte";
import { formatCurrency } from "@/helpers/formatters";
import InlineInput from "@/Components/InlineInput";
import { format } from "path";
import dayjs from "dayjs";
import InlineInput2 from "@/Components/InlineInput2";
import { Input } from "@headlessui/react";
import { isNumber } from "@/helpers/utils";
import { useUpdateEffect } from "@/hooks/useUpdateEffect";
import FloatingButton from "@/Components/FloatingIconButton";
import { BsFileExcel } from "react-icons/bs";
import axios from "axios";

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
    return items.reduce((total, item) => {
        const value = isNumber(Number(item[field])) ? Number(item[field]) : 0;
        return total + (typeof value === "number" ? value : 0);
    }, 0);
}

const ValueInTable = ({
    label,
    value,
    readonly = true,
    onChange,
}: {
    label: string;
    value: number | string;
    readonly?: boolean;
    onChange?: (value: string) => void;
}) => {
    return (
        <tr>
            <td className="text-left">
                <Text size="2" weight="bold">
                    {label}:
                </Text>
            </td>
            <td className="pl-2 text-center">
                <Input
                    readOnly={readonly}
                    onChange={(e) => {
                        if (onChange) {
                            onChange(e.target.value);
                        }
                    }}
                    className="w-full text-right"
                    value={
                        isNumber(value) ? formatCurrency(Number(value)) : value
                    }
                />
            </td>
        </tr>
    );
};

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

    const cortesWithTotals = cortes.map((corte) => ({
        ...corte,
        balance_total: calculateTotal(corte.notes, "balance"),
        material_total: calculateTotal(corte.notes, "purchase_total"),
        date: formatDate(corte.date),
    }));

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

            router.get(
                route("cortes_semanales.create", { branch: branch.id }),
                { start_date: formattedStart, end_date: formattedEnd },
                { preserveState: true }
            );
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

    return (
        <Container headTitle={"Corte semanal"}>
            <FloatingButton
                position="bottom-right"
                icon={<FaFileExcel className="w-6 h-6" />}
                onClick={handleSubmitData}
            />
            <div style={{ minHeight: "calc(100vh - 130px)" }}>
                <div className="flex flex-col gap-1">
                    <Text size="2" className="text-gray-500">
                        {branch.name}
                    </Text>
                </div>
                <div>
                    <Text size="5" className="font-semibold">
                        Generar corte semanal
                    </Text>
                    <br />
                    <Flex>
                        <div className="w-full">
                            <Datepicker
                                value={value}
                                onChange={handleChange}
                                displayFormat="DD/MM/YYYY"
                                primaryColor="blue"
                                showShortcuts={false}
                                configs={{}}
                            />
                        </div>
                    </Flex>
                </div>
                {/* <Flex gap="2" className="m-4 mx-0">
                    <Button
                        color="gray"
                        variant="soft"
                        className="hover:cursor-pointer"
                        onClick={() => {
                            router.visit(
                                route("cortes_semanales.index", {
                                    branch: branch.id,
                                })
                            );
                        }}
                    >
                        <BiArrowBack />
                        Lista de cortes semanales
                    </Button>
                </Flex> */}
                <Flex justify="between" className="mb-4" gap="2">
                    <div className="flex justify-center w-full py-8">
                        <Text size="4" weight="bold" align="center">
                            {getTitle()}
                        </Text>
                    </div>

                    {isDetail && (
                        <Flex gap="2">
                            <IconButton
                                color="green"
                                className="hover:cursor-pointer"
                                size="2"
                                onClick={() => {
                                    /*  Inertia.get(
                                        route("cortes.export", {
                                            corte: corte.id,
                                        })
                                    ); */
                                }}
                            >
                                <FaDownload />
                            </IconButton>
                            <IconButton
                                color="red"
                                className="hover:cursor-pointer"
                                size="2"
                                onClick={() => {
                                    confirmAlert({
                                        title: "Eliminar corte",
                                        message:
                                            "¿Estás seguro de eliminar este corte?",
                                        buttons: [
                                            {
                                                label: "Sí",
                                                onClick: () => {
                                                    Inertia.delete(
                                                        route(
                                                            "cortes_semanales.destroy",
                                                            {
                                                                corte: corteSemanal.id,
                                                            }
                                                        )
                                                    );
                                                },
                                            },
                                            {
                                                label: "No",
                                            },
                                        ],
                                    });
                                }}
                            >
                                <BiTrash className="w-5 h-5" />
                            </IconButton>
                        </Flex>
                    )}
                </Flex>

                <br />
                <Flex
                    className="mb-4"
                    gap="2"
                    direction={{
                        md: "row",
                        xs: "column",
                        sm: "column",
                        initial: "column",
                    }}
                >
                    <div>
                        <table>
                            <tbody>
                                <ValueInTable
                                    label="Venta total"
                                    value={totals.sale_total}
                                />
                                <ValueInTable
                                    label="Restan notas"
                                    value={totals.balance_total}
                                />
                                <ValueInTable
                                    label="Transfenrencias"
                                    value={totals.transfer_total}
                                />
                                <ValueInTable
                                    label="Entradas"
                                    value={totals.previous_notes_total}
                                />
                                <ValueInTable
                                    label="Gastos"
                                    value={totals.expenses_total}
                                />
                                <ValueInTable
                                    label="Efectivo"
                                    value={totals.cash_total}
                                />
                                <ValueInTable
                                    label="Material"
                                    value={totals.material_total}
                                />
                                <ValueInTable
                                    label="Sueldos"
                                    value={salary}
                                    readonly={false}
                                    onChange={(value: string) => {
                                        setSalary(value);
                                    }}
                                />
                                <ValueInTable
                                    label="Gastos extra"
                                    value={extraExpenses}
                                />
                                <ValueInTable
                                    label="50%"
                                    value={fiftyPercent}
                                />
                            </tbody>
                        </table>
                    </div>
                    <div className="flex justify-center w-full">
                        <div className="mt-8">
                            <Text size="4" weight="bold">
                                GASTOS EXTRA
                            </Text>
                            <table className="mt-8">
                                <tbody>
                                    <ValueInTable
                                        label="Gasolina chofer casetas"
                                        value={expenses.gasolina}
                                        readonly={false}
                                        onChange={(value: string) => {
                                            setExpenses({
                                                ...expenses,
                                                gasolina: value,
                                            });
                                        }}
                                    />
                                    <ValueInTable
                                        label="Luz"
                                        value={expenses.luz}
                                        readonly={false}
                                        onChange={(value: string) => {
                                            setExpenses({
                                                ...expenses,
                                                luz: value,
                                            });
                                        }}
                                    />
                                    <ValueInTable
                                        label="Renta"
                                        value={expenses.renta}
                                        readonly={false}
                                        onChange={(value: string) => {
                                            setExpenses({
                                                ...expenses,
                                                renta: value,
                                            });
                                        }}
                                    />
                                    <ValueInTable
                                        label="Total"
                                        value={extraExpenses}
                                    />
                                </tbody>
                            </table>
                        </div>
                    </div>
                </Flex>

                <br />

                <Flex justify="center" className="mb-4">
                    <Text size="4" weight="bold">
                        CORTES
                    </Text>
                </Flex>
                <Table.Root>
                    <Table.Header>
                        <Table.Row>
                            <Table.ColumnHeaderCell className="text-center">
                                FECHA
                            </Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell className="text-center">
                                VENTA
                            </Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell className="text-center">
                                RESTA
                            </Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell className="text-center">
                                TRANSFERENCIAS
                            </Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell className="text-center">
                                ENTRADAS
                            </Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell className="text-center">
                                GASTOS
                            </Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell className="text-center">
                                EFECTIVO
                            </Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell className="text-center">
                                MATERIAL
                            </Table.ColumnHeaderCell>
                        </Table.Row>
                    </Table.Header>
                    <Table.Body>
                        {cortesWithTotals.map((corte) => (
                            <Table.Row
                                className="border-b border-gray-200 hover:cursor-pointer hover:bg-gray-100 odd:bg-white even:bg-gray-50 "
                                key={corte.id}
                                onClick={(e: any) => {
                                    //open in a new tab
                                    router.visit(
                                        route("cortes.show", corte.id),
                                        {}
                                    );
                                }}
                            >
                                <Table.Cell className="text-center">
                                    <Text size="3" weight="bold">
                                        {corte.date}
                                    </Text>
                                </Table.Cell>
                                <Table.Cell className="text-center">
                                    <Text size="3" weight="medium">
                                        {formatCurrency(corte.sale_total)}
                                    </Text>
                                </Table.Cell>
                                <Table.Cell className="text-center">
                                    <Text size="3" weight="medium">
                                        {formatCurrency(corte.balance_total)}
                                    </Text>
                                </Table.Cell>
                                <Table.Cell className="text-center">
                                    <Text size="3" weight="medium">
                                        {formatCurrency(corte.transfer_total)}
                                    </Text>
                                </Table.Cell>
                                <Table.Cell className="text-center">
                                    <Text size="3" weight="medium">
                                        {formatCurrency(
                                            corte.previous_notes_total
                                        )}
                                    </Text>
                                </Table.Cell>
                                <Table.Cell className="text-center">
                                    <Text size="3" weight="medium">
                                        {formatCurrency(corte.expenses_total)}
                                    </Text>
                                </Table.Cell>
                                <Table.Cell className="text-center">
                                    <Text size="3" weight="medium">
                                        {formatCurrency(corte.cash_total)}
                                    </Text>
                                </Table.Cell>
                                <Table.Cell className="text-center">
                                    <Text size="3" weight="medium">
                                        {formatCurrency(corte.material_total)}
                                    </Text>
                                </Table.Cell>
                            </Table.Row>
                        ))}
                        <Table.Row className="border-b border-gray-200 hover:cursor-pointer hover:bg-gray-100 odd:bg-white even:bg-gray-50 ">
                            <Table.Cell className="text-center">
                                <Text size="3" weight="bold">
                                    TOTAL
                                </Text>
                            </Table.Cell>
                            <Table.Cell className="text-center">
                                <Text size="3" weight="bold">
                                    {formatCurrency(
                                        calculateTotal(
                                            cortesWithTotals,
                                            "sale_total"
                                        )
                                    )}
                                </Text>
                            </Table.Cell>
                            <Table.Cell className="text-center">
                                <Text size="3" weight="bold">
                                    {formatCurrency(
                                        calculateTotal(
                                            cortesWithTotals,
                                            "balance_total"
                                        )
                                    )}
                                </Text>
                            </Table.Cell>
                            <Table.Cell className="text-center">
                                <Text size="3" weight="bold">
                                    {formatCurrency(
                                        calculateTotal(
                                            cortesWithTotals,
                                            "transfer_total"
                                        )
                                    )}
                                </Text>
                            </Table.Cell>
                            <Table.Cell className="text-center">
                                <Text size="3" weight="bold">
                                    {formatCurrency(
                                        calculateTotal(
                                            cortesWithTotals,
                                            "previous_notes_total"
                                        )
                                    )}
                                </Text>
                            </Table.Cell>
                            <Table.Cell className="text-center">
                                <Text size="3" weight="bold">
                                    {formatCurrency(
                                        calculateTotal(
                                            cortesWithTotals,
                                            "expenses_total"
                                        )
                                    )}
                                </Text>
                            </Table.Cell>
                            <Table.Cell className="text-center">
                                <Text size="3" weight="bold">
                                    {formatCurrency(
                                        calculateTotal(
                                            cortesWithTotals,
                                            "cash_total"
                                        )
                                    )}
                                </Text>
                            </Table.Cell>
                            <Table.Cell className="text-center">
                                <Text size="3" weight="bold">
                                    {formatCurrency(
                                        calculateTotal(
                                            cortesWithTotals,
                                            "material_total"
                                        )
                                    )}
                                </Text>
                            </Table.Cell>
                        </Table.Row>
                    </Table.Body>
                </Table.Root>
            </div>
        </Container>
    );
};

export default CorteSemanalForm;
