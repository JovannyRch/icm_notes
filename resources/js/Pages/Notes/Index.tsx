import BranchSelector from "@/Components/BranchSelector";
import Container from "@/Components/Container";
import DeliveryStatusBadge from "@/Components/DeliveryStatusBadge";
import Pagination from "@/Components/Pagination";
import StatusPaidBadge from "@/Components/StatusPaidBadge";
import { STATUS_DELIVERY_ENUM } from "@/const";
import { formatCurrency, formatDate } from "@/helpers/formatters";
import useAlerts from "@/hooks/useAlerts";
import { PageProps, payment_status } from "@/types";
import { Branch } from "@/types/Branch";
import { Note } from "@/types/Note";
import { Inertia } from "@inertiajs/inertia";
import { router } from "@inertiajs/react";
import {
    Badge,
    Button,
    Checkbox,
    Flex,
    Grid,
    Table,
    Text,
} from "@radix-ui/themes";
import { useState } from "react";
import { BiArchive, BiArrowBack } from "react-icons/bi";
import { CgAdd } from "react-icons/cg";
import { GiCancel } from "react-icons/gi";
import { MdUnarchive } from "react-icons/md";
import { TbCashRegister, TbTrash } from "react-icons/tb";
import DateFilter from "./components/DateFilter";
import NoteSearchInput from "./components/NoteSearchInput";
import SaleCustomerStatusFilter from "./components/SaleCustomerStatusFilter";
import { BsCashCoin } from "react-icons/bs";

interface Props extends PageProps {
    pagination: any;
    branch: Branch;
    branches: Branch[];
}

const Home = ({ pagination, flash, branch, branches }: Props) => {
    const { data: notes } = pagination;

    const archivedParam = Boolean(route().params.archived);

    const [selectedItems, setSelectedItems] = useState<number[]>([]);

    useAlerts(flash);

    const handleOnArchive = () => {
        Inertia.post(route("notes.archive.items"), {
            branch: branch!.id,
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
            branch: branch!.id,
            ids: selectedItems.map((id) => id.toString()),
        });
    };

    return (
        <Container headTitle="Notas">
            <div style={{ minHeight: "calc(100vh - 130px)" }}>
                <Flex
                    justify="between"
                    align="center"
                    className="mb-6"
                    direction={{
                        md: "row",
                        xs: "column",
                        sm: "column",
                        initial: "column",
                    }}
                >
                    <Text size="6" className="font-semibold">
                        {`Notas ${archivedParam ? "archivadas" : ""} (${
                            pagination.total
                        }) - ${branch.name}`}
                    </Text>
                    <div>
                        <BranchSelector
                            branches={branches}
                            branch={branch}
                            onChange={(branch) => {
                                router.visit(
                                    route("notas", { branch: branch.id })
                                );
                            }}
                        />
                    </div>
                </Flex>
                <Flex justify="between" gap="4" className="my-4">
                    <Flex
                        gap="2"
                        direction={{
                            md: "row",
                            xs: "column",
                            sm: "column",
                            initial: "column",
                        }}
                    >
                        <Button
                            onClick={() => {
                                router.visit(
                                    route("notes.create", {
                                        branch: branch!.id,
                                    })
                                );
                            }}
                            className="hover:cursor-pointer"
                        >
                            Crear Nota
                            <CgAdd className="w-5 h-5" />
                        </Button>
                        <Button
                            type="button"
                            color="gold"
                            variant="soft"
                            onClick={() => {
                                router.visit(
                                    route("cortes.new", { branch: branch.id })
                                );
                            }}
                            className="hover:cursor-pointer"
                        >
                            Generar Corte
                            <TbCashRegister className="w-5 h-5" />
                        </Button>
                        <Button
                            color="bronze"
                            variant="soft"
                            className="hover:cursor-pointer"
                            onClick={() => {
                                router.visit(
                                    route("cortes", {
                                        branch: branch.id,
                                    })
                                );
                            }}
                        >
                            Cortes
                            <BsCashCoin className="w-5 h-5" />
                        </Button>
                    </Flex>
                    <Flex
                        gap="2"
                        direction={{
                            md: "row",
                            xs: "column",
                            sm: "column",
                            initial: "column",
                        }}
                    >
                        {archivedParam ? (
                            <>
                                <Button
                                    color="bronze"
                                    variant="soft"
                                    className="hover:cursor-pointer"
                                    onClick={() => {
                                        router.visit(
                                            route("notas", {
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
                                    variant="soft"
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
                                    color="bronze"
                                    variant="soft"
                                    className="hover:cursor-pointer"
                                    onClick={() => {
                                        router.visit(
                                            route("notas", {
                                                branch: branch!.id,
                                                archived: true,
                                            })
                                        );
                                    }}
                                >
                                    Ver archivados
                                    <BiArchive className="w-5 h-5" />
                                </Button>
                                <Button
                                    variant="soft"
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
                            variant="soft"
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
                            variant="soft"
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
                </Flex>

                <Grid gap="5" columns="8" className="mb-4">
                    <Grid
                        gridColumn={{
                            lg: "span 3",
                            md: "span 4",
                            xs: "span 8",
                            initial: "span 8",
                        }}
                    >
                        <NoteSearchInput />
                    </Grid>
                    <Grid
                        gridColumn={{
                            lg: "span 5",
                            md: "span 4",
                            xs: "span 8",
                        }}
                    >
                        <Flex
                            gap="5"
                            align="center"
                            justify={{
                                md: "start",
                                initial: "between",
                            }}
                            direction={{
                                md: "row",
                                initial: "column",
                            }}
                        >
                            <DateFilter />
                            <SaleCustomerStatusFilter />
                        </Flex>
                    </Grid>
                </Grid>

                <Table.Root>
                    <Table.Header>
                        <Table.Row>
                            <Table.ColumnHeaderCell className="text-center">
                                <div className="min-w-[25px]">
                                    {selectedItems.length > 0 &&
                                        `(${selectedItems.length})`}
                                </div>
                            </Table.ColumnHeaderCell>

                            <Table.ColumnHeaderCell className="text-center">
                                No. Nota
                            </Table.ColumnHeaderCell>

                            <Table.ColumnHeaderCell className="text-center">
                                Fecha
                            </Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell className="text-center">
                                Total venta cliente
                            </Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell className="text-center">
                                Estatus venta cliente
                            </Table.ColumnHeaderCell>

                            <Table.ColumnHeaderCell className="text-center">
                                Total compra
                            </Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell className="text-center">
                                Estatus compra
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
                                            onChange={() => {}}
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
                                    {formatCurrency(note.sale_total)}
                                </Table.Cell>
                                <Table.Cell className="text-center">
                                    <StatusPaidBadge
                                        status={note.status as payment_status}
                                        label={
                                            note.status === "pending"
                                                ? "Pendiente"
                                                : note.status === "paid"
                                                ? "Pagado"
                                                : "Cancelado"
                                        }
                                    />
                                </Table.Cell>

                                <Table.Cell className="text-center">
                                    {formatCurrency(note.purchase_total)}
                                </Table.Cell>
                                <Table.Cell className="text-center">
                                    <StatusPaidBadge
                                        status={
                                            note.purchase_status as payment_status
                                        }
                                        label={
                                            note.purchase_status === "pending"
                                                ? "Costo pendiente"
                                                : "Costo pagado"
                                        }
                                    />
                                </Table.Cell>

                                <Table.Cell className="text-center">
                                    <DeliveryStatusBadge
                                        status={
                                            note.delivery_status as STATUS_DELIVERY_ENUM
                                        }
                                    />
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

export default Home;
