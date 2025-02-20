import Container from "@/Components/Container";
import Pagination from "@/Components/Pagination";
import { DELIVERY_STATUS_MAP, STATUS_DELIVERY_ENUM } from "@/const";
import { formatCurrency, formatDate } from "@/helpers/formatters";
import useAlerts from "@/hooks/useAlerts";
import { PageProps } from "@/types";
import { Branch } from "@/types/Branch";
import { Note } from "@/types/Note";
import { Inertia } from "@inertiajs/inertia";
import { router } from "@inertiajs/react";
import { Badge, Button, Checkbox, Flex, Table, Text } from "@radix-ui/themes";
import { useState } from "react";
import { BiArchive, BiArrowBack } from "react-icons/bi";
import { CgAdd, CgCheck } from "react-icons/cg";
import { GiCancel } from "react-icons/gi";
import { MdUnarchive } from "react-icons/md";
import { TbTrash, TbTruckDelivery } from "react-icons/tb";

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
            <div style={{ minHeight: "calc(100vh - 130px)" }}>
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
                                    className="hover:cursor-pointer"
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
                                    className="hover:cursor-pointer"
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
                                    className="hover:cursor-pointer"
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
                                    className="hover:cursor-pointer"
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
                            color="gold"
                            className="btn btn-secondary hover:cursor-pointer"
                            onClick={() => {
                                setSelectedItems([]);
                            }}
                            disabled={selectedItems.length === 0}
                        >
                            Deshacer selección
                            <GiCancel />
                        </Button>
                        <Button
                            type="button"
                            color="red"
                            className="btn btn-secondary hover:cursor-pointer"
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
                            className="hover:cursor-pointer"
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

                            <Table.ColumnHeaderCell className="text-center">
                                No. Nota
                            </Table.ColumnHeaderCell>

                            <Table.ColumnHeaderCell className="text-center">
                                Fecha
                            </Table.ColumnHeaderCell>

                            <Table.ColumnHeaderCell className="text-center">
                                Estatus de compra
                            </Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell className="text-center">
                                Total compra
                            </Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell className="text-center">
                                Estatus de pago
                            </Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell className="text-center">
                                Total venta
                            </Table.ColumnHeaderCell>

                            <Table.ColumnHeaderCell className="text-center">
                                Estatus de entrega
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
                                className="border-b border-gray-200 hover:cursor-pointer hover:bg-gray-100 odd:bg-white even:bg-gray-50 "
                            >
                                <Table.Cell className="clickable">
                                    <div className="flex items-center justify-center w-full h-full checkbox clickable">
                                        <Checkbox
                                            className="cursor-pointer hover:cursor-pointer clickable"
                                            checked={selectedItems.includes(
                                                note.id!
                                            )}
                                            onClick={() => {
                                                if (
                                                    selectedItems.includes(
                                                        note.id!
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
                                                        note.id!,
                                                    ]);
                                                }
                                            }}
                                        />
                                    </div>
                                </Table.Cell>

                                <Table.Cell className="text-center">
                                    <div className="flex items-center justify-center w-full h-full">
                                        {note.folio}
                                    </div>
                                </Table.Cell>
                                <Table.Cell className="text-center">
                                    {formatDate(note.date)}
                                </Table.Cell>
                                <Table.Cell className="text-center">
                                    <div className="flex items-center justify-center gap-2">
                                        {note.purchase_status === "paid" ? (
                                            <Badge color="green">
                                                Compra liquidada
                                            </Badge>
                                        ) : (
                                            <Badge color="orange">
                                                Compra no liquidada
                                            </Badge>
                                        )}
                                    </div>
                                </Table.Cell>

                                <Table.Cell className="text-center">
                                    {formatCurrency(note.purchase_total)}
                                </Table.Cell>

                                <Table.Cell className="text-center">
                                    <div className="flex items-center justify-center gap-2">
                                        {note.status === "paid" ? (
                                            <Badge color="green">Pagado</Badge>
                                        ) : (
                                            <Badge color="orange">
                                                Pago pendiente
                                            </Badge>
                                        )}
                                    </div>
                                </Table.Cell>
                                <Table.Cell className="text-center">
                                    {formatCurrency(note.sale_total)}
                                </Table.Cell>

                                <Table.Cell className="text-center">
                                    <div className="flex items-center justify-center gap-2">
                                        <div>
                                            {
                                                DELIVERY_STATUS_MAP[
                                                    note.delivery_status
                                                ]
                                            }
                                        </div>
                                        {note.delivery_status ===
                                            STATUS_DELIVERY_ENUM.PAID_TO_SEND && (
                                            <TbTruckDelivery className="text-orange-600" />
                                        )}
                                        {note.delivery_status ===
                                            STATUS_DELIVERY_ENUM.DELIVERED && (
                                            <CgCheck className="text-green-600 w-7 h-7" />
                                        )}
                                    </div>
                                </Table.Cell>
                            </Table.Row>
                        ))}
                    </Table.Body>
                </Table.Root>

                {notes.length === 0 && (
                    <div className="flex items-center justify-center w-full h-full min-h-[52vh]">
                        <Text size="6">No se econtraron notas</Text>
                    </div>
                )}

                <Pagination pagination={pagination} />
            </div>
        </Container>
    );
};

export default Show;
