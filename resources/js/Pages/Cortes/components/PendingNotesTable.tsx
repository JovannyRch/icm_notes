import DynamicTable, { Column } from "@/Components/DynamicTable";
import { formatCurrency } from "@/helpers/formatters";
import { isNumber } from "@/helpers/utils";
import { Branch } from "@/types/Branch";
import { router } from "@inertiajs/react";
import { Flex, Text } from "@radix-ui/themes";
import axios from "axios";
import { useMemo } from "react";
import { toast } from "react-toastify";

interface Props {
    previousNotes: PreviousNoteInput[];
    setPreviousNotes: (notes: PreviousNoteInput[]) => void;
    isDisabled?: boolean;
    branch: Branch;
}

const PendingNotesTable = ({
    previousNotes,
    setPreviousNotes,
    isDisabled,
    branch,
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
                onRowClick={({ folio = "" }) => {
                    axios
                        .get(`/api/notes/${branch.id}/searchByFolio/${folio}`)
                        .then(({ data }) => {
                            const { id = null } = data;

                            if (id) {
                                window.open(route("notes.show", id), "_blank");
                            } else {
                                toast.error(
                                    `No se encontró la nota ${folio} en sucursal ${branch.name}`
                                );
                            }
                        })
                        .catch((error) => {
                            toast.error(
                                `Error al buscar la nota ${folio} en sucursal ${branch.name}`
                            );
                        });
                }}
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
