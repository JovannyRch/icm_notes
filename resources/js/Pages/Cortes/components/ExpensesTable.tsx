import DynamicTable, { Column } from "@/Components/DynamicTable";
import { formatCurrency } from "@/helpers/formatters";
import { isNumber } from "@/helpers/utils";
import { Flex, Text } from "@radix-ui/themes";
import { useMemo } from "react";

interface Props {
    expenses: ExpenseInput[];
    setExpenses: (notes: ExpenseInput[]) => void;
    isDisabled?: boolean;
}

const ExpensesTable = ({ expenses, setExpenses, isDisabled }: Props) => {
    const columns: Column<ExpenseInput>[] = [
        { label: "CONCEPTO", key: "concept" },
        { label: "CANTIDAD", key: "amount" },
    ];

    const expensesSum = useMemo(
        () =>
            expenses.reduce(
                (currentValue, currentItem) =>
                    currentValue +
                    (isNumber(currentItem.amount)
                        ? Number(currentItem.amount)
                        : 0),
                0
            ),
        [expenses]
    );

    return (
        <div>
            <Flex justify="center" className="mb-4">
                <Text size="4" weight="bold">
                    GASTOS
                </Text>
            </Flex>

            <DynamicTable<ExpenseInput>
                columns={columns}
                rows={expenses}
                setRows={setExpenses}
                isEditable={!isDisabled}
            />
            <div className="flex justify-end gap-4">
                <div className="flex justify-end mt-6">
                    <Text weight="bold">
                        Total devoluciones:
                        {formatCurrency(expensesSum)}
                    </Text>
                </div>
            </div>
        </div>
    );
};

export default ExpensesTable;
