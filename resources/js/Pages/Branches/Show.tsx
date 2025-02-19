import Container from "@/Components/Container";
import Pagination from "@/Components/Pagination";
import { DELIVERY_STATUS_MAP } from "@/const";
import { formatCurrency, formatDate } from "@/helpers/formatters";
import useAlerts from "@/hooks/useAlerts";
import { PageProps } from "@/types";
import { Branch } from "@/types/Branch";
import { Note } from "@/types/Note";
import { router } from "@inertiajs/react";
import { Button, Link, Table } from "@radix-ui/themes";
import { CgAdd } from "react-icons/cg";

interface Props extends PageProps {
    pagination: any;
    branch: Branch;
}

const Show = ({ branch, pagination, flash }: Props) => {
    const { data: notes } = pagination;

    useAlerts(flash);

    return (
        <Container title={`Notas | ${branch.name}`}>
            <>
                <div className="flex justify-end">
                    <Button
                        onClick={() => {
                            router.visit(
                                route("notes.create", { branch: branch.id })
                            );
                        }}
                    >
                        Crear Nota
                        <CgAdd className="w-5 h-5" />
                    </Button>
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
                            <Table.ColumnHeaderCell>A/C</Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell>
                                Restante
                            </Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell>
                                Total venta
                            </Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell>
                                Total compra
                            </Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell>
                                Fecha
                            </Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell>
                                Estatus de entrega
                            </Table.ColumnHeaderCell>

                            <Table.ColumnHeaderCell>
                                Estatus de pago
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
                                    {formatCurrency(note.balance)}
                                </Table.Cell>
                                <Table.Cell>
                                    {formatCurrency(note.sale_total)}
                                </Table.Cell>
                                <Table.Cell>
                                    {formatCurrency(note.purchase_total)}
                                </Table.Cell>
                                <Table.Cell>
                                    {formatCurrency(note.sale_total)}
                                </Table.Cell>

                                <Table.Cell>{formatDate(note.date)}</Table.Cell>
                                <Table.Cell>
                                    {DELIVERY_STATUS_MAP[note.delivery_status]}
                                </Table.Cell>
                                <Table.Cell>{note.status}</Table.Cell>
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
