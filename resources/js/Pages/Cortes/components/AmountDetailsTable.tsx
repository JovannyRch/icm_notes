import InlineInput from "@/Components/InlineInput";
import { formatCurrency } from "@/helpers/formatters";
import { Branch } from "@/types/Branch";
import { Inertia } from "@inertiajs/inertia";
import { router } from "@inertiajs/react";
import { Flex, Table, Text } from "@radix-ui/themes";

interface Props {
    total: number;
    cashSum: number;
    transferSum: number;
    cardSum: number;
    balanceSum: number;
    expensesSum: number;
    previousNotesTotal: number;
    date: string;
    isDisabled: boolean;
    branch: Branch;
}

const AmountDetailsTable = ({
    total,
    cashSum,
    transferSum,
    cardSum,
    balanceSum,
    expensesSum,
    previousNotesTotal,
    date,
    isDisabled,
    branch,
}: Props) => {
    return (
        <>
            <Table.Root>
                <Table.Body>
                    <Table.Row className="border-b border-gray-200 hover:bg-gray-100 odd:bg-white even:bg-gray-50 ">
                        <Table.Cell></Table.Cell>
                        <Table.Cell className="text-right">
                            <Flex gap="2" justify="end" align="center">
                                <Text size="3" weight="medium">
                                    Fecha
                                </Text>

                                <input
                                    type="date"
                                    value={date}
                                    className="min-w-[200px] text-right rounded-md h-8 px-2"
                                    disabled={isDisabled}
                                    onChange={(e) => {
                                        router.visit(
                                            route("cortes.new", {
                                                branch: branch.id,
                                                date: e.target.value,
                                            })
                                        );
                                    }}
                                />
                            </Flex>
                        </Table.Cell>
                    </Table.Row>
                    <Table.Row className="border-b border-gray-200 hover:bg-gray-100 odd:bg-white even:bg-gray-50 ">
                        <Table.Cell></Table.Cell>
                        <Table.Cell></Table.Cell>
                    </Table.Row>

                    <Table.Row className="border-b border-gray-200 hover:bg-gray-100 odd:bg-white even:bg-gray-50 ">
                        <Table.Cell>
                            <Text size="3" weight="bold">
                                Venta total:
                            </Text>
                        </Table.Cell>
                        <Table.Cell>
                            <Text size="3" weight="medium">
                                {formatCurrency(total)}
                            </Text>
                        </Table.Cell>
                    </Table.Row>
                    <Table.Row className="border-b border-gray-200 hover:bg-gray-100 odd:bg-white even:bg-gray-50 ">
                        <Table.Cell>
                            <Text size="3" weight="bold">
                                Efectivo:
                            </Text>
                        </Table.Cell>
                        <Table.Cell>
                            <Text size="3" weight="medium">
                                {formatCurrency(cashSum)}
                            </Text>
                        </Table.Cell>
                    </Table.Row>
                    <Table.Row className="border-b border-gray-200 hover:bg-gray-100 odd:bg-white even:bg-gray-50 ">
                        <Table.Cell>
                            <Text size="3" weight="bold">
                                Transferencia:
                            </Text>
                        </Table.Cell>
                        <Table.Cell>
                            <Text size="3" weight="medium">
                                {formatCurrency(transferSum)}
                            </Text>
                        </Table.Cell>
                    </Table.Row>
                    <Table.Row className="border-b border-gray-200 hover:bg-gray-100 odd:bg-white even:bg-gray-50 ">
                        <Table.Cell>
                            <Text size="3" weight="bold">
                                Tarjeta:
                            </Text>
                        </Table.Cell>
                        <Table.Cell>
                            <Text size="3" weight="medium">
                                {formatCurrency(cardSum)}
                            </Text>
                        </Table.Cell>
                    </Table.Row>
                    <Table.Row className="border-b border-gray-200 hover:bg-gray-100 odd:bg-white even:bg-gray-50 ">
                        <Table.Cell>
                            <Text size="3" weight="bold">
                                Entradas:
                            </Text>
                        </Table.Cell>
                        <Table.Cell>
                            <Text size="3" weight="medium">
                                {formatCurrency(previousNotesTotal)}
                            </Text>
                        </Table.Cell>
                    </Table.Row>
                    <Table.Row className="border-b border-gray-200 hover:bg-gray-100 odd:bg-white even:bg-gray-50 ">
                        <Table.Cell>
                            <Text size="3" weight="bold">
                                Restan notas:
                            </Text>
                        </Table.Cell>
                        <Table.Cell>
                            <Text size="3" weight="medium">
                                {formatCurrency(balanceSum)}
                            </Text>
                        </Table.Cell>
                    </Table.Row>
                    <Table.Row className="border-b border-gray-200 hover:bg-gray-100 odd:bg-white even:bg-gray-50 ">
                        <Table.Cell>
                            <Text size="3" weight="bold">
                                Gastos:
                            </Text>
                        </Table.Cell>
                        <Table.Cell>
                            <Text size="3" weight="medium">
                                {formatCurrency(expensesSum)}
                            </Text>
                        </Table.Cell>
                    </Table.Row>
                </Table.Body>
            </Table.Root>
        </>
    );
};

export default AmountDetailsTable;
