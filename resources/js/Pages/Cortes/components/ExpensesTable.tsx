import DynamicTable, { Column } from "@/Components/DynamicTable";
import { formatCurrency } from "@/helpers/formatters";
import { isNumber } from "@/helpers/utils";
import { useMemo } from "react";

interface Props {
    expenses: ExpenseInput[];
    setExpenses: (rows: ExpenseInput[]) => void;
    isDisabled?: boolean;
}

const ExpensesTable = ({ expenses, setExpenses, isDisabled }: Props) => {
    const columns: Column<ExpenseInput>[] = [
        { label: "Concepto", key: "concept", placeholder: "Agregar concepto..." },
        { label: "Cantidad", key: "amount", money: true, placeholder: "0.00" },
    ];

    const sum = useMemo(
        () => expenses.reduce((acc, item) => acc + (isNumber(item.amount) ? Number(item.amount) : 0), 0),
        [expenses]
    );

    return (
        <div>
            <DynamicTable<ExpenseInput>
                columns={columns}
                rows={expenses}
                setRows={setExpenses}
                isEditable={!isDisabled}
            />
            <div className="flex justify-end pt-3 text-sm">
                <span className="mr-2 text-steel">Total gastos</span>
                <span className="font-semibold tabular-nums">{formatCurrency(sum)}</span>
            </div>
        </div>
    );
};

export default ExpensesTable;
