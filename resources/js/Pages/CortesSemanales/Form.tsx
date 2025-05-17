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
import { FaDownload } from "react-icons/fa6";
import { useState } from "react";
import Datepicker, { DateValueType } from "react-tailwindcss-datepicker";
import { Corte } from "@/types/Corte";
import { formatCurrency } from "@/helpers/formatters";
import InlineInput from "@/Components/InlineInput";

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

const CorteSemanalForm = ({
    flash,
    corteSemanal,
    branch,
    initial_start,
    initial_end,
    cortes,
}: Props) => {
    useAlerts(flash);

    const isDetail = !!corteSemanal;

    const [value, setValue] = useState<DateValueType>({
        startDate: initial_start,
        endDate: initial_end,
    });

    const handleChange = (newValue: any) => {
        setValue(newValue);

        const start_date = newValue.startDate;
        const end_date = newValue.endDate;

        if (start_date && end_date) {
            router.get(
                route("cortes_semanales.create", { branch: branch.id }),
                { start_date, end_date },
                { preserveState: true }
            );
        }
    };

    return (
        <Container headTitle={"Corte semanal"}>
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
                <Flex gap="2" className="m-4 mx-0">
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
                </Flex>
                <Flex justify="between" className="mb-4" gap="2">
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
                {/* Grid of two columns */}
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
                    <div className="w-full">
                        <InlineInput
                            name="venta_total"
                            label="Semana"
                            value="1"
                        />
                    </div>
                    <div className="w-full"></div>
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
                        {cortes.map((corte) => (
                            <Table.Row
                                className="border-b border-gray-200 hover:cursor-pointer hover:bg-gray-100 odd:bg-white even:bg-gray-50 "
                                key={corte.id}
                            >
                                <Table.Cell className="text-center">
                                    <Text size="3" weight="bold">
                                        {formatDate(corte.date)}
                                    </Text>
                                </Table.Cell>
                                <Table.Cell className="text-center">
                                    <Text size="3" weight="medium">
                                        {formatCurrency(corte.sale_total)}
                                    </Text>
                                </Table.Cell>
                                <Table.Cell className="text-center">
                                    <Text size="3" weight="medium">
                                        {/*  {formatCurrency(corte)} */}
                                    </Text>
                                </Table.Cell>
                                <Table.Cell className="text-center">
                                    <Text size="3" weight="medium">
                                        {formatCurrency(corte.transfer_total)}
                                    </Text>
                                </Table.Cell>
                                <Table.Cell className="text-center">
                                    <Text size="3" weight="medium">
                                        {/*  {formatCurrency(note.sale_total)} */}
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
                                        {/*
                                        {note?.purchase_total
                                            ? formatCurrency(
                                                  note?.purchase_total
                                              )
                                            : "-"} */}
                                    </Text>
                                </Table.Cell>
                            </Table.Row>
                        ))}
                    </Table.Body>
                </Table.Root>
            </div>
        </Container>
    );
};

export default CorteSemanalForm;
