import DynamicTable, { Column } from "@/Components/DynamicTable";
import { formatCurrency } from "@/helpers/formatters";
import { isNumber } from "@/helpers/utils";
import { Flex, Text } from "@radix-ui/themes";
import { useMemo } from "react";

interface Props {
    returns: ReturnInput[];
    setReturns: (returns: ReturnInput[]) => void;
    isDisabled?: boolean;
}

const ReturnsTable = ({ returns, setReturns, isDisabled }: Props) => {
    const columns: Column<ReturnInput>[] = [
        { label: "CONCEPTO", key: "concept" },
        { label: "CANTIDAD", key: "amount" },
    ];

    const returnsSum = useMemo(
        () =>
            returns.reduce(
                (currentValue, currentItem) =>
                    currentValue +
                    (isNumber(currentItem.amount)
                        ? Number(currentItem.amount)
                        : 0),
                0
            ),
        [returns]
    );

    return (
        <div>
            <Flex justify="center" className="mb-4">
                <Text size="4" weight="bold">
                    DEVOLUCIONES
                </Text>
            </Flex>

            <DynamicTable<ReturnInput>
                columns={columns}
                rows={returns}
                setRows={setReturns}
                isEditable={!isDisabled}
            />
            <div className="flex justify-end gap-4">
                <div className="flex justify-end mt-6">
                    <Text weight="bold">
                        Total devoluciones:
                        {formatCurrency(returnsSum)}
                    </Text>
                </div>
            </div>
        </div>
    );
};

export default ReturnsTable;
