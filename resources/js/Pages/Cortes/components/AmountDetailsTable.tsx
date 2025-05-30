import InlineInput from "@/Components/InlineInput";
import { formatCurrency } from "@/helpers/formatters";
import { Branch } from "@/types/Branch";
import { Inertia } from "@inertiajs/inertia";
import { router } from "@inertiajs/react";
import { Flex, Table, Text } from "@radix-ui/themes";
import { formatDate } from "date-fns";
import DatePicker from "react-datepicker";
import { es } from "date-fns/locale/es";

interface Props {
    total: number;
    cashSum: number;
    transferSum: number;
    cardSum: number;
    balanceSum: number;
    expensesSum: number;
    previousNotesTotal: number;
    returnsSum: number;
    date: string;
    isDisabled: boolean;
    branch: Branch;
    purchasesSum: number;
}

const AmountDetailsTable = ({
    total,
    cashSum,
    transferSum,
    cardSum,
    balanceSum,
    expensesSum,
    previousNotesTotal,
    returnsSum,
    date,
    branch,
    purchasesSum = 0,
}: Props) => {
    const selectedDate = new Date(date + "T00:00");

    return (
        <div>
            <Table.Root>
                <Table.Body>
                    <Table.Row className="border-b border-gray-200 hover:bg-gray-100 odd:bg-white even:bg-gray-50 ">
                        <Table.Cell></Table.Cell>
                        <Table.Cell className="text-right">
                            <Flex gap="2" justify="end" align="center">
                                <Text size="3" weight="medium">
                                    Fecha
                                </Text>

                                <DatePicker
                                    locale={es}
                                    dateFormat={"dd/MM/yyyy"}
                                    className="min-w-[200px]  rounded-md h-8 px-2"
                                    selected={selectedDate}
                                    onSelect={(date) => {
                                        if (!date) {
                                            return;
                                        }
                                        router.visit(
                                            route("cortes.new", {
                                                branch: branch.id,
                                                date: formatDate(
                                                    date,
                                                    "yyyy-MM-dd"
                                                ),
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
                    <Table.Row className="border-b border-gray-200 hover:bg-gray-100 odd:bg-white even:bg-gray-50 ">
                        <Table.Cell>
                            <Text size="3" weight="bold">
                                Devoluciones:
                            </Text>
                        </Table.Cell>
                        <Table.Cell>
                            <Text size="3" weight="medium">
                                {formatCurrency(returnsSum)}
                            </Text>
                        </Table.Cell>
                    </Table.Row>
                    <Table.Row className="border-b border-gray-200 hover:bg-gray-100 odd:bg-white even:bg-gray-50 ">
                        <Table.Cell>
                            <Text size="3" weight="bold">
                                Total de compra a pisos Leo:
                            </Text>
                        </Table.Cell>
                        <Table.Cell>
                            <Text size="3" weight="medium">
                                {formatCurrency(purchasesSum)}
                            </Text>
                        </Table.Cell>
                    </Table.Row>
                </Table.Body>
            </Table.Root>
        </div>
    );
};

export default AmountDetailsTable;
