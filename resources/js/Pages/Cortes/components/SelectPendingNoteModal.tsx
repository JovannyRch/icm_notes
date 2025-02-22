import Modal from "@/Components/Modal";
import TailwindIconButton from "@/Components/TailwindIconButton";
import {
    TailwindTable,
    TailwindTableCell,
    TailwindTableRow,
} from "@/Components/TailwindTable";
import { formatCurrency, formatDate } from "@/helpers/formatters";
import { Note } from "@/types/Note";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

interface SelectNoteModalProps {
    onSelect: (note: Note) => void;
    isOpen: boolean;
    onClose: () => void;
    selectedPendingNotes: Note[];
}

const fetchNotes = async () => {
    const { data } = await axios.get("/api/notes/status/pending");
    return data;
};

const SelectPendingNoteModal = ({
    onSelect,
    isOpen,
    onClose,
    selectedPendingNotes,
}: SelectNoteModalProps) => {
    const { data: notes = [], isLoading } = useQuery({
        queryKey: ["notes", "pending"],
        queryFn: fetchNotes,
        enabled: isOpen,
        initialData: [],
    });

    console.log("selectedPendingNotes", selectedPendingNotes);

    return (
        <Modal show={isOpen} onClose={onClose}>
            <div className="p-4">
                <h2 className="text-lg font-semibold">
                    Notas pendientes de pago
                </h2>
                <div
                    className="mt-4 max-h-[500px]
                min-h-[200px]
                overflow-y-auto"
                >
                    <TailwindTable
                        headers={[
                            "No NOTA",
                            "FECHA",
                            "A CTA",
                            "RESTA",
                            "TOTAL",
                        ]}
                    >
                        {notes.map((note: Note) => (
                            <TailwindTableRow
                                key={note.id}
                                onClick={() => {
                                    if (
                                        selectedPendingNotes.find(
                                            (selectedNote) =>
                                                selectedNote.id === note.id
                                        )
                                    ) {
                                        return;
                                    }
                                    onSelect(note);
                                }}
                                className={` ${
                                    selectedPendingNotes.find(
                                        (selectedNote) =>
                                            selectedNote.id === note.id
                                    )
                                        ? "cursor-not-allowed"
                                        : "cursor-pointer"
                                }`}
                            >
                                <TailwindTableCell>
                                    {note.folio}
                                </TailwindTableCell>
                                <TailwindTableCell>
                                    {formatDate(note.date)}
                                </TailwindTableCell>
                                <TailwindTableCell>
                                    {formatCurrency(note.advance)}
                                </TailwindTableCell>
                                <TailwindTableCell>
                                    {formatCurrency(note.balance)}
                                </TailwindTableCell>
                                <TailwindTableCell>
                                    {formatCurrency(note.sale_total)}
                                </TailwindTableCell>
                            </TailwindTableRow>
                        ))}
                    </TailwindTable>
                </div>
            </div>
            <div className="flex justify-end gap-4 p-4">
                <button
                    color="gray"
                    onClick={onClose}
                    className="px-4 py-2 text-white bg-gray-500 rounded-md"
                >
                    Cancelar
                </button>
            </div>
        </Modal>
    );
};

export default SelectPendingNoteModal;
