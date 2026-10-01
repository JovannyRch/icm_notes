import DynamicTable, { Column } from "@/Components/DynamicTable";
import { formatCurrency } from "@/helpers/formatters";
import { isNumber } from "@/helpers/utils";
import { useMemo } from "react";

interface Props {
    returns: ReturnInput[];
    setReturns: (rows: ReturnInput[]) => void;
    isDisabled?: boolean;
}

const ReturnsTable = ({ returns, setReturns, isDisabled }: Props) => {
    const columns: Column<ReturnInput>[] = [
        { label: "Concepto", key: "concept", placeholder: "Agregar concepto..." },
        { label: "Cantidad", key: "amount", money: true, placeholder: "0.00" },
    ];

    const sum = useMemo(
        () => returns.reduce((acc, item) => acc + (isNumber(item.amount) ? Number(item.amount) : 0), 0),
        [returns]
    );

    return (
        <div>
            <DynamicTable<ReturnInput>
                columns={columns}
                rows={returns}
                setRows={setReturns}
                isEditable={!isDisabled}
            />
            <div className="flex justify-end pt-3 text-sm">
                <span className="mr-2 text-steel">Total devoluciones</span>
                <span className="font-semibold tabular-nums">{formatCurrency(sum)}</span>
            </div>
        </div>
    );
};

export default ReturnsTable;
