import Container from "@/Components/Container";
import Pagination from "@/Components/Pagination";
import { DELIVERY_STATUS_MAP } from "@/const";
import { formatCurrency, formatDate } from "@/helpers/formatters";
import useAlerts from "@/hooks/useAlerts";
import { PageProps } from "@/types";
import { Branch } from "@/types/Branch";
import { Note } from "@/types/Note";
import { Inertia } from "@inertiajs/inertia";
import { router } from "@inertiajs/react";
import { Button, Checkbox, Flex, Link, Table, Text } from "@radix-ui/themes";
import { useState } from "react";
import { BiArchive, BiArrowBack } from "react-icons/bi";
import { CgAdd } from "react-icons/cg";
import { MdUnarchive } from "react-icons/md";
import { TbTrash } from "react-icons/tb";

interface Props extends PageProps {
    pagination: any;
    branch: Branch;
}

const Show = ({ branch, pagination, flash }: Props) => {
    const { data: notes } = pagination;

    const archivedParam = Boolean(route().params.archived);

    const [selectedItems, setSelectedItems] = useState<number[]>([]);

    useAlerts(flash);

    const handleOnArchive = () => {
        Inertia.post(route("notes.archive.items"), {
            branch: branch.id,
            ids: selectedItems.map((id) => id.toString()),
        });
    };

    const handleOnDelete = () => {
        if (
            confirm(
                `¿Estás seguro de eliminar ${selectedItems.length} nota${
                    selectedItems.length > 1 ? "s" : ""
                }? Esta acción no se puede deshacer`
            )
        ) {
            Inertia.post(route("notes.destroy.items"), {
                ids: selectedItems.map((id) => id.toString()),
            });
        }
    };

    const handleOnUnarchive = () => {
        Inertia.post(route("notes.unarchive.items"), {
            branch: branch.id,
            ids: selectedItems.map((id) => id.toString()),
        });
    };

    return (
        <Container headTitle="Notas">
            <div className="min-h-[70vh]">
                <div>
                    <Text size="6" className="font-semibold">
                        {`Notas - ${branch.name}`}
                    </Text>
                </div>
                <Flex justify="between" gap="4" className="my-4">
                    <Flex gap="2">
                        {archivedParam ? (
                            <>
                                <Button
                                    color="bronze"
                                    onClick={() => {
                                        router.visit(
                                            route("branches.notes", {
                                                branch: branch.id,
                                            })
                                        );
                                    }}
                                >
                                    Regresar a la lista
                                    <BiArrowBack className="w-5 h-5" />
                                </Button>

                                <Button
                                    color="orange"
                                    disabled={selectedItems.length === 0}
                                    onClick={handleOnUnarchive}
                                >
                                    Desarchivar
                                    <MdUnarchive className="w-5 h-5" />
                                </Button>
                            </>
                        ) : (
                            <>
                                <Button
                                    color="amber"
                                    onClick={() => {
                                        router.visit(
                                            route("branches.notes", {
                                                branch: branch.id,
                                                archived: true,
                                            })
                                        );
                                    }}
                                >
                                    Ver archivados
                                    <BiArchive className="w-5 h-5" />
                                </Button>
                                <Button
                                    color="amber"
                                    disabled={selectedItems.length === 0}
                                    onClick={handleOnArchive}
                                >
                                    Archivar
                                    <BiArchive className="w-5 h-5" />
                                </Button>
                            </>
                        )}
                        <Button
                            type="button"
                            color="red"
                            className="btn btn-secondary"
                            onClick={handleOnDelete}
                            disabled={selectedItems.length === 0}
                        >
                            Eliminar
                            <TbTrash />
                        </Button>
                    </Flex>
                    <div>
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
                </Flex>

                <Table.Root>
                    <Table.Header>
                        <Table.Row>
                            <Table.ColumnHeaderCell></Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell>Id</Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell>
                                No. Nota
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
                        </Table.Row>
                    </Table.Header>

                    <Table.Body>
                        {(notes as Note[]).map((note) => (
                            <Table.Row
                                key={note.id}
                                onClick={(e: any) => {
                                    if (
                                        !e.target.classList.contains(
                                            "clickable"
                                        )
                                    ) {
                                        router.visit(
                                            route("notes.show", note.id)
                                        );
                                    }
                                }}
                            >
                                <Table.Cell className="clickable">
                                    <div className="flex items-center justify-center w-full h-full checkbox clickable">
                                        <Checkbox
                                            className="clickable"
                                            checked={selectedItems.includes(
                                                note.id
                                            )}
                                            onClick={() => {
                                                if (
                                                    selectedItems.includes(
                                                        note.id
                                                    )
                                                ) {
                                                    setSelectedItems(
                                                        selectedItems.filter(
                                                            (id) =>
                                                                id !== note.id
                                                        )
                                                    );
                                                } else {
                                                    setSelectedItems([
                                                        ...selectedItems,
                                                        note.id,
                                                    ]);
                                                }
                                            }}
                                        />
                                    </div>
                                </Table.Cell>
                                <Table.Cell>{note.id}</Table.Cell>
                                <Table.Cell>{note.folio}</Table.Cell>

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
                            </Table.Row>
                        ))}
                    </Table.Body>
                </Table.Root>

                {notes.length === 0 && (
                    <div className="flex items-center justify-center w-full h-full min-h-[50vh]">
                        <Text size="6">No se econtraron notas</Text>
                    </div>
                )}

                <Pagination pagination={pagination} />
            </div>
        </Container>
    );
};

export default Show;
