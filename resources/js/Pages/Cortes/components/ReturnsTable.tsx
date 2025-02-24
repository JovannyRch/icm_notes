import DynamicTable, { Column } from "@/Components/DynamicTable";
import { Flex, Text } from "@radix-ui/themes";

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

    return (
        <>
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
        </>
    );
};

export default ReturnsTable;
