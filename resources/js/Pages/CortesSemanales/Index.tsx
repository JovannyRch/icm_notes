import Container from "@/Components/Container";
import Pagination from "@/Components/Pagination";
import { formatCurrency } from "@/helpers/formatters";
import useAlerts from "@/hooks/useAlerts";
import { PageProps } from "@/types";
import { Branch } from "@/types/Branch";
import { Corte } from "@/types/Corte";
import { CorteSemanal } from "@/types/CorteSemanal";
import { router } from "@inertiajs/react";
import { Button, Flex, Table, Text } from "@radix-ui/themes";
import { BiArrowBack } from "react-icons/bi";

import { CgAdd } from "react-icons/cg";

interface CortesProps extends PageProps {
    branch: Branch;
    pagination: any;
    month: string;
    year: string;
    branches: Branch[];
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
                <Flex
                    gap="2"
                    className="my-5"
                    direction={{
                        md: "row",
                        xs: "column",
                        sm: "column",
                        initial: "column",
                    }}
                >
                    <div>
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
                            <BiArrowBack />
                            Notas
                        </Button>
                    </div>

                    <div>
                        <Button
                            onClick={() => {
                                router.visit(
                                    route("cortes_semanales.create", {
                                        branch: branch.id,
                                    })
                                );
                            }}
                            className="hover:cursor-pointer"
                        >
                            Generar corte semanal
                            <CgAdd className="w-5 h-5" />
                        </Button>
                    </div>
                    <div></div>
                </Flex>

                <Table.Root>
                    <Table.Header>
                        <Table.Row>
                            <Table.ColumnHeaderCell>Id</Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell>
                                Semana
                            </Table.ColumnHeaderCell>

                            <Table.ColumnHeaderCell>
                                Venta total
                            </Table.ColumnHeaderCell>

                            <Table.ColumnHeaderCell>
                                Efectivo
                            </Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell>
                                Gastos
                            </Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell>%</Table.ColumnHeaderCell>
                        </Table.Row>
                    </Table.Header>

                    <Table.Body>
                        {(cortes as CorteSemanal[]).map((corte) => (
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
                                <Table.Cell>
                                    {corte.fecha_inicio}-{corte.fecha_fin}
                                </Table.Cell>
                                <Table.Cell>
                                    <Text weight="bold">
                                        {formatCurrency(corte.venta_total)}
                                    </Text>
                                </Table.Cell>
                                <Table.Cell>
                                    <Text weight="bold">
                                        {formatCurrency(corte.efectivo)}
                                    </Text>
                                </Table.Cell>
                                <Table.Cell>
                                    {formatCurrency(corte.gastos)}
                                </Table.Cell>
                                <Table.Cell>
                                    {formatCurrency(corte.porcentaje)}
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
