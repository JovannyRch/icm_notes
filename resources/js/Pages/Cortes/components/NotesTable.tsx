import { formatCurrency, formatDate } from "@/helpers/formatters";
import { getPaymentMethods } from "@/helpers/utils";
import { Note } from "@/types/Note";
import { Badge, IconButton } from "@radix-ui/themes";
import { TbTrash } from "react-icons/tb";

interface Props {
    isEditable?: boolean;
    notes: Note[];
    setNotes: (notes: Note[]) => void;
}

const isCanceled = (note: Note) => note.status === "canceled" || note.delivery_status === "cancelado";

const NotesTable = ({ notes, setNotes, isEditable }: Props) => {
    if (notes.length === 0) {
        return <p className="py-8 text-sm text-center text-fog">No hay notas en este día.</p>;
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="text-xs text-left text-fog uppercase border-b border-ash">
                        <th className="py-2 pr-3 font-medium">No. nota</th>
                        <th className="py-2 pr-3 font-medium">Fecha</th>
                        <th className="py-2 pr-3 font-medium text-right">A cta</th>
                        <th className="py-2 pr-3 font-medium text-right">Resta</th>
                        <th className="py-2 pr-3 font-medium text-right">Total venta</th>
                        <th className="py-2 pr-3 font-medium">Método de pago</th>
                        <th className="py-2 pr-3 font-medium text-right">Total compra</th>
                        {isEditable && <th className="w-10 py-2" aria-label="Acciones" />}
                    </tr>
                </thead>
                <tbody className="tabular-nums">
                    {notes.map((note) => {
                        const canceled = isCanceled(note);
                        return (
                            <tr
                                key={note.id}
                                title={isEditable ? "Abrir nota en otra pestaña" : undefined}
                                className={`border-b border-ash/70 ${isEditable ? "cursor-pointer hover:bg-paper" : ""} ${canceled ? "text-silver" : "text-charcoal"}`}
                                onClick={(e) => {
                                    if (!isEditable) return;
                                    if (!(e.target as HTMLElement).closest(".clickable")) {
                                        window.open(route("notes.show", note.id), "_blank");
                                    }
                                }}
                            >
                                <td className="py-2 pr-3 font-semibold whitespace-nowrap">
                                    {note.folio}
                                    {canceled && (
                                        <Badge color="red" variant="soft" size="1" className="ml-2">
                                            Cancelada
                                        </Badge>
                                    )}
                                </td>
                                <td className="py-2 pr-3 whitespace-nowrap">{formatDate(note.date)}</td>
                                <td className="py-2 pr-3 text-right">{formatCurrency(note.advance)}</td>
                                <td className="py-2 pr-3 text-right">{formatCurrency(note.balance)}</td>
                                <td className={`py-2 pr-3 text-right font-medium ${canceled ? "line-through" : ""}`}>
                                    {formatCurrency(note.sale_total)}
                                </td>
                                <td className="py-2 pr-3">{getPaymentMethods(note).join(", ") || "-"}</td>
                                <td className="py-2 pr-3 text-right">
                                    {note?.purchase_total ? formatCurrency(note.purchase_total) : "-"}
                                </td>
                                {isEditable && (
                                    <td className="py-2 text-center clickable">
                                        <IconButton
                                            type="button"
                                            className="hover:cursor-pointer clickable"
                                            color="red"
                                            variant="ghost"
                                            size="1"
                                            aria-label={`Quitar la nota ${note.folio} del corte`}
                                            title="Quitar del corte"
                                            onClick={() => setNotes(notes.filter((n) => n.id !== note.id))}
                                        >
                                            <TbTrash className="clickable" />
                                        </IconButton>
                                    </td>
                                )}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

export default NotesTable;
