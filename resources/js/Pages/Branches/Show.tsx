import Container from "@/Components/Container";
import Pagination from "@/Components/Pagination";
import { formatCurrency, formatDate } from "@/helpers/formatters";
import useAlerts from "@/hooks/useAlerts";
import { PageProps } from "@/types";
import { Branch } from "@/types/Branch";
import { Note } from "@/types/Note";
import { Link, Table } from "@radix-ui/themes";

interface Props extends PageProps {
    pagination: any;
    branch: Branch;
}

const Show = ({ branch, pagination, flash }: Props) => {
    const { data: notes } = pagination;

    useAlerts(flash);

    return (
        <Container title="Notas">
            <>
                <div className="flex justify-end">
                    <Link href={route("notes.create", { branch: 1 })}>
                        Crear Nota
                    </Link>
                </div>
                <Table.Root>
                    <Table.Header>
                        <Table.Row>
                            <Table.ColumnHeaderCell>
                                No. Nota
                            </Table.ColumnHeaderCell>

                            <Table.ColumnHeaderCell>
                                Cliente
                            </Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell>
                                A cuenta
                            </Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell>
                                Restan
                            </Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell>
                                Total
                            </Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell>
                                Fecha
                            </Table.ColumnHeaderCell>

                            <Table.ColumnHeaderCell></Table.ColumnHeaderCell>
                        </Table.Row>
                    </Table.Header>

                    <Table.Body>
                        {(notes as Note[]).map((note) => (
                            <Table.Row key={note.id}>
                                <Table.Cell>{note.folio}</Table.Cell>
                                <Table.Cell>{note.customer ?? "-"}</Table.Cell>
                                <Table.Cell>
                                    {formatCurrency(note.advance)}
                                </Table.Cell>
                                <Table.Cell>
                                    {formatCurrency(note.total - note.advance)}
                                </Table.Cell>
                                <Table.Cell>
                                    {formatCurrency(note.total)}
                                </Table.Cell>

                                <Table.Cell>{formatDate(note.date)}</Table.Cell>
                                <Table.Cell>
                                    <div className="flex gap-1">
                                        <Link
                                            href={route("notes.show", note.id)}
                                        >
                                            Ver
                                        </Link>
                                    </div>
                                </Table.Cell>
                            </Table.Row>
                        ))}
                    </Table.Body>
                </Table.Root>
                <Pagination pagination={pagination} />
            </>
        </Container>
    );
};

export default Show;
