import DynamicTable, { Column } from "@/Components/DynamicTable";
import { formatCurrency } from "@/helpers/formatters";
import { isNumber } from "@/helpers/utils";

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
        { label: "No. nota", key: "folio", placeholder: "Folio" },
        { label: "Fecha", key: "date", type: "date" },
        { label: "Efectivo", key: "cash", money: true, placeholder: "0.00" },
        { label: "Transferencia", key: "transfer", money: true, placeholder: "0.00" },
        { label: "Tarjeta", key: "card", money: true, placeholder: "0.00" },
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
            <div className="flex flex-wrap justify-end pt-3 text-sm gap-x-6 gap-y-1">
                {[
                    ["Efectivo", cashTotal],
                    ["Transferencia", transferTotal],
                    ["Tarjeta", cardTotal],
                ].map(([label, value]) => (
                    <span key={label as string}>
                        <span className="mr-2 text-steel">Total {String(label).toLowerCase()}</span>
                        <span className="font-semibold tabular-nums">{formatCurrency(value as number)}</span>
                    </span>
                ))}
            </div>
        </>
    );
};

export default PendingNotesTable;
