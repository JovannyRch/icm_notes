import { formatCurrency, formatDate } from "@/helpers/formatters";
import { getPaymentMethods } from "@/helpers/utils";
import { Note } from "@/types/Note";
import { Flex, IconButton, Table, Text } from "@radix-ui/themes";
import { CgRemove } from "react-icons/cg";

interface Props {
    isEditable?: boolean;
    notes: Note[];
    setNotes: (notes: Note[]) => void;
}

const NotesTable = ({ notes, setNotes, isEditable }: Props) => {
    const cashTotal = notes.reduce((prev, current) => prev + current.cash, 0);
    const transferTotal = notes.reduce(
        (prev, current) => prev + current.transfer,
        0
    );
    const cardTotal = notes.reduce((prev, current) => prev + current.card, 0);

    return (
        <div>
            <Flex justify="center" className="mb-4">
                <Text size="4" weight="bold">
                    VENTA CON NOTAS DE PEDIDO
                </Text>
            </Flex>
            <Table.Root>
                <Table.Header>
                    <Table.Row>
                        <Table.ColumnHeaderCell className="text-center">
                            No. NOTA
                        </Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell className="text-center">
                            FECHA
                        </Table.ColumnHeaderCell>

                        <Table.ColumnHeaderCell className="text-center">
                            A CTA
                        </Table.ColumnHeaderCell>

                        <Table.ColumnHeaderCell className="text-center">
                            RESTA
                        </Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell className="text-center">
                            TOTAL
                        </Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell className="text-center">
                            MÉTODO DE PAGO
                        </Table.ColumnHeaderCell>

                        {isEditable && (
                            <Table.ColumnHeaderCell className="text-center"></Table.ColumnHeaderCell>
                        )}
                    </Table.Row>
                </Table.Header>
                <Table.Body>
                    {notes.map((note) => (
                        <Table.Row
                            className="border-b border-gray-200 hover:cursor-pointer hover:bg-gray-100 odd:bg-white even:bg-gray-50 "
                            onClick={(e: any) => {
                                if (!isEditable) {
                                    return;
                                }
                                if (!e.target.classList.contains("clickable")) {
                                    window.open(
                                        route("notes.show", note.id),
                                        "_blank"
                                    );
                                }
                            }}
                            key={note.id}
                        >
                            <Table.Cell className="text-center">
                                <Text size="3" weight="bold">
                                    {note.folio}
                                </Text>
                            </Table.Cell>
                            <Table.Cell className="text-center">
                                <Text size="3" weight="medium">
                                    {formatDate(note.date)}
                                </Text>
                            </Table.Cell>
                            <Table.Cell className="text-center">
                                <Text size="3" weight="medium">
                                    {formatCurrency(note.advance)}
                                </Text>
                            </Table.Cell>
                            <Table.Cell className="text-center">
                                <Text size="3" weight="medium">
                                    {formatCurrency(note.balance)}
                                </Text>
                            </Table.Cell>
                            <Table.Cell className="text-center">
                                <Text size="3" weight="medium">
                                    {formatCurrency(note.sale_total)}
                                </Text>
                            </Table.Cell>
                            <Table.Cell className="text-center">
                                <Text size="3" weight="medium">
                                    {getPaymentMethods(note).join(", ")}
                                </Text>
                            </Table.Cell>
                            {isEditable && (
                                <Table.Cell className="text-center clickable">
                                    <div className="clickable">
                                        <IconButton
                                            className="hover:cursor-pointer clickable"
                                            color="red"
                                            size="1"
                                            onClick={() => {
                                                setNotes(
                                                    notes.filter(
                                                        (n) => n.id !== note.id
                                                    )
                                                );
                                            }}
                                        >
                                            <CgRemove className="clickable" />
                                        </IconButton>
                                    </div>
                                </Table.Cell>
                            )}
                        </Table.Row>
                    ))}
                </Table.Body>
            </Table.Root>
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
        </div>
    );
};

export default NotesTable;
