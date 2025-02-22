import DynamicTable, { Column } from "@/Components/DynamicTable";
import { Flex, Text } from "@radix-ui/themes";

interface Props {
    previousNotes: PreviousNoteInput[];
    setPreviousNotes: (notes: PreviousNoteInput[]) => void;
    isDisabled?: boolean;
}

const PendingNotesTable = ({
    previousNotes,
    setPreviousNotes,
    isDisabled,
}: Props) => {
    const columns: Column<PreviousNoteInput>[] = [
        { label: "No NOTA", key: "folio" },
        { label: "FECHA", key: "date", type: "date" },
        { label: "RESTA", key: "amount" },
    ];

    return (
        <>
            <Flex justify="center" className="mb-4">
                <Text size="4" weight="bold">
                    ENTRADAS ANTERIORES
                </Text>
            </Flex>

            <DynamicTable<PreviousNoteInput>
                columns={columns}
                rows={previousNotes}
                setRows={setPreviousNotes}
                isEditable={!isDisabled}
            />
        </>
    );
};

export default PendingNotesTable;
