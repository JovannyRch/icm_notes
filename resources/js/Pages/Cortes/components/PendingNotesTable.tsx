import DynamicTable, { Column } from "@/Components/DynamicTable";
import { formatCurrency } from "@/helpers/formatters";
import { isNumber } from "@/helpers/utils";
import { Flex, Text } from "@radix-ui/themes";
import { useMemo } from "react";

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
        { label: "EFECTIVO", key: "cash" },
        { label: "TRANSFERENCIA", key: "transfer" },
        { label: "TARJETA", key: "card" },
    ];

    const cashTotal = useMemo(
        () =>
            previousNotes.reduce(
                (prev, current) =>
                    prev + (isNumber(current.cash) ? Number(current.cash) : 0),
                0
            ),
        [previousNotes]
    );

    const transferTotal = useMemo(
        () =>
            previousNotes.reduce(
                (prev, current) =>
                    prev +
                    (isNumber(current.transfer) ? Number(current.transfer) : 0),
                0
            ),
        [previousNotes]
    );

    const cardTotal = useMemo(
        () =>
            previousNotes.reduce(
                (prev, current) =>
                    prev + (isNumber(current.card) ? Number(current.card) : 0),
                0
            ),
        [previousNotes]
    );

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
            <div className="flex justify-around gap-4">
                <div className="flex justify-end mt-6">
                    <Text weight="bold">
                        Total efectivo:
                        {formatCurrency(cashTotal)}
                    </Text>
                </div>
                <div className="flex justify-end mt-6">
                    <Text weight="bold">
                        Total transferencia:
                        {formatCurrency(transferTotal)}
                    </Text>
                </div>
                <div className="flex justify-end mt-6">
                    <Text weight="bold">
                        Total tarjeta:
                        {formatCurrency(cardTotal)}
                    </Text>
                </div>
            </div>
        </>
    );
};

export default PendingNotesTable;
