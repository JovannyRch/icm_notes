import Container from "@/Components/Container";
import Pagination from "@/Components/Pagination";
import { formatCurrency } from "@/helpers/formatters";
import useAlerts from "@/hooks/useAlerts";
import { PageProps } from "@/types";
import { Branch } from "@/types/Branch";
import { Corte } from "@/types/Corte";
import { router } from "@inertiajs/react";
import { Button, Flex, Table, Text } from "@radix-ui/themes";
import { BiArrowBack } from "react-icons/bi";

import { CgAdd } from "react-icons/cg";

interface CortesProps extends PageProps {
    branch: Branch;
    pagination: any;
}

const CortesIndex = ({ branch, pagination, flash }: CortesProps) => {
    const { data: cortes } = pagination;

    useAlerts(flash);

    return (
        <Container headTitle="Cortes">
            <div style={{ minHeight: "calc(100vh - 130px)" }}>
                <div>
                    <Text size="6" className="font-semibold">
                        Cortes - {branch.name}
                    </Text>
                </div>
                <Flex justify="between" gap="4" className="my-4">
                    <Flex gap="2">
                        <Button
                            onClick={() => {
                                router.visit(
                                    route("cortes.new", { branch: branch.id })
                                );
                            }}
                            className="hover:cursor-pointer"
                        >
                            Crear un corte
                            <CgAdd className="w-5 h-5" />
                        </Button>
                        <Button
                            type="button"
                            color="gray"
                            variant="soft"
                            className="btn btn-secondary hover:cursor-pointer"
                            onClick={() => {
                                router.visit(
                                    route("notas", {
                                        branch: branch.id,
                                    })
                                );
                            }}
                        >
                            Regresar al listado de notas
                            <BiArrowBack />
                        </Button>
                    </Flex>
                </Flex>

                <Table.Root>
                    <Table.Header>
                        <Table.Row>
                            <Table.ColumnHeaderCell>Id</Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell>
                                Fecha
                            </Table.ColumnHeaderCell>

                            <Table.ColumnHeaderCell>
                                Venta total
                            </Table.ColumnHeaderCell>

                            <Table.ColumnHeaderCell>
                                Efectivo
                            </Table.ColumnHeaderCell>
                            {/*  <Table.ColumnHeaderCell>
                                Transferencia
                            </Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell>
                                Tarjeta
                            </Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell>
                                Entradas
                            </Table.ColumnHeaderCell> */}

                            <Table.ColumnHeaderCell>
                                Gastos
                            </Table.ColumnHeaderCell>
                        </Table.Row>
                    </Table.Header>

                    <Table.Body>
                        {(cortes as Corte[]).map((corte) => (
                            <Table.Row
                                key={corte.id}
                                onClick={(e: any) => {
                                    if (
                                        !e.target.classList.contains(
                                            "clickable"
                                        )
                                    ) {
                                        router.visit(
                                            route("cortes.show", corte.id)
                                        );
                                    }
                                }}
                                className="border-b border-gray-200 hover:cursor-pointer hover:bg-gray-100 odd:bg-white even:bg-gray-50 "
                            >
                                <Table.Cell>{corte.id}</Table.Cell>
                                <Table.Cell>{corte.date}</Table.Cell>
                                <Table.Cell>
                                    <Text weight="bold">
                                        {formatCurrency(corte.sale_total)}
                                    </Text>
                                </Table.Cell>
                                <Table.Cell>
                                    <Text weight="bold">
                                        {formatCurrency(corte.cash_total)}
                                    </Text>
                                </Table.Cell>

                                <Table.Cell>
                                    {formatCurrency(corte.expenses_total)}
                                </Table.Cell>
                            </Table.Row>
                        ))}
                    </Table.Body>
                </Table.Root>

                {cortes.length === 0 && (
                    <div className="flex items-center justify-center w-full h-full min-h-[52vh]">
                        <Text size="6">No se econtraron cortes</Text>
                    </div>
                )}

                <Pagination pagination={pagination} />
            </div>
        </Container>
    );
};

export default CortesIndex;
