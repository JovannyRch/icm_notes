import DynamicTable, { Column } from "@/Components/DynamicTable";
import { Flex, Text } from "@radix-ui/themes";

interface Props {
    expenses: ExpenseInput[];
    setExpenses: (notes: ExpenseInput[]) => void;
    isDisabled?: boolean;
}

const ExpensesTable = ({ expenses, setExpenses, isDisabled }: Props) => {
    const columns: Column<ExpenseInput>[] = [
        { label: "CANTIDAD", key: "amount" },
        { label: "CONCEPTO", key: "concept" },
    ];

    return (
        <>
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
        </>
    );
};

export default ExpensesTable;
