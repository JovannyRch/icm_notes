import Container from "@/Components/Container";
import DeliveryStatusBadge from "@/Components/DeliveryStatusBadge";
import Pagination from "@/Components/Pagination";
import StatusPaidBadge from "@/Components/StatusPaidBadge";
import PageHeader from "@/Components/ui/PageHeader";
import { STATUS_DELIVERY_ENUM } from "@/const";
import { formatCurrency, formatDate } from "@/helpers/formatters";
import useAlerts from "@/hooks/useAlerts";
import { useBranch } from "@/hooks/useBranch";
import { PageProps, payment_status } from "@/types";
import { Note } from "@/types/Note";
import { Link, router } from "@inertiajs/react";
import { Button, Checkbox, DropdownMenu, Table } from "@radix-ui/themes";
import { useMemo, useState } from "react";
import { confirmAlert } from "react-confirm-alert";
import {
    LuArchive,
    LuArchiveRestore,
    LuCalculator,
    LuCalendarRange,
    LuChevronDown,
    LuFilePlus,
    LuHistory,
    LuPackagePlus,
    LuTrash2,
    LuX,
} from "react-icons/lu";
import { useLocalStorage } from "usehooks-ts";
import DateFilter from "./components/DateFilter";
import DeliveryStatusFilter from "./components/DeliveryStatusFilter";
import NoteSearchInput from "./components/NoteSearchInput";
import PurchaseStatusFilter from "./components/PurchaseStatusFilter";
import SaleCustomerStatusFilter from "./components/SaleCustomerStatusFilter";

interface Props extends PageProps {
    pagination: any;
    branch: Branch;
}

const saleLabel = (status: string) =>
    status === "pending" ? "Pendiente" : status === "paid" ? "Pagado" : "Cancelado";

const Home = ({ pagination, flash }: Props) => {
    const notes: Note[] = pagination.data;

    const { currentBranch: branch } = useBranch();
    const archivedParam = Boolean(route().params.archived);

    const [selectedItems, setSelectedItems] = useState<number[]>([]);

    useAlerts(flash);

    // router (Inertia 2) en lugar del cliente legado @inertiajs/inertia: aquel no entiende
    // la respuesta del servidor, recargaba la página completa y se perdía el mensaje.
    const afterBulk = { preserveScroll: true, onSuccess: () => setSelectedItems([]) };

    const handleOnArchive = () => {
        router.post(
            route("notes.archive.items"),
            { branch: branch!.id, ids: selectedItems.map((id) => id.toString()) },
            afterBulk
        );
    };

    const handleOnUnarchive = () => {
        router.post(
            route("notes.unarchive.items"),
            { branch: branch!.id, ids: selectedItems.map((id) => id.toString()) },
            afterBulk
        );
    };

    const handleOnDelete = () => {
        const total = selectedItems.length;
        confirmAlert({
            title: `Eliminar ${total} nota${total > 1 ? "s" : ""}`,
            message: `¿Estás seguro de eliminar ${total} nota${total > 1 ? "s" : ""}? Esta acción no se puede deshacer.`,
            buttons: [
                {
                    label: "Eliminar",
                    onClick: () =>
                        router.post(
                            route("notes.destroy.items"),
                            { ids: selectedItems.map((id) => id.toString()) },
                            afterBulk
                        ),
                },
                { label: "Cancelar" },
            ],
        });
    };

    const hasFiltersApplied = useMemo(() => {
        const params = route().params;
        const noFilterParams = ["page", "archived"];
        return Object.keys(params).some((key) => !noFilterParams.includes(key)) && params.date !== "THIS_WEEK";
    }, []);

    const noFiltersParamValues = useMemo(() => {
        const params = route().params;
        const filteredParams: Record<string, any> = {};
        ["page", "archived"].forEach((key) => {
            if (key in params) filteredParams[key] = params[key];
        });
        return filteredParams;
    }, []);

    const [filterDate, setFilterDate] = useLocalStorage(`date-filter-${branch?.id}`, "THIS_WEEK");

    const pageIds = notes.map((note) => note.id!);
    const allSelected = pageIds.length > 0 && pageIds.every((id) => selectedItems.includes(id));
    const someSelected = selectedItems.length > 0 && !allSelected;

    const toggle = (id: number) =>
        setSelectedItems(selectedItems.includes(id) ? selectedItems.filter((i) => i !== id) : [...selectedItems, id]);

    const listUrl = (archived: boolean) =>
        route("notas", {
            ...(archived ? { archived: true } : {}),
            date: route().params.date ?? filterDate,
        });

    return (
        <Container headTitle="Notas">
            <div style={{ minHeight: "calc(100vh - 130px)" }}>
                <PageHeader
                    eyebrow={branch?.name}
                    title={archivedParam ? "Notas archivadas" : "Notas"}
                    description={`${pagination.total} ${pagination.total === 1 ? "nota" : "notas"}`}
                    actions={
                        <>
                            <DropdownMenu.Root>
                                <DropdownMenu.Trigger>
                                    <Button variant="outline" color="gray">
                                        Cortes
                                        <LuChevronDown />
                                    </Button>
                                </DropdownMenu.Trigger>
                                <DropdownMenu.Content align="end" variant="soft" color="gray">
                                    <DropdownMenu.Item onSelect={() => router.visit(route("cortes.new"))}>
                                        <LuCalculator /> Generar corte del día
                                    </DropdownMenu.Item>
                                    <DropdownMenu.Item onSelect={() => router.visit(route("cortes"))}>
                                        <LuHistory /> Ver cortes
                                    </DropdownMenu.Item>
                                    <DropdownMenu.Item onSelect={() => router.visit(route("cortes_semanales.create"))}>
                                        <LuCalendarRange /> Generar corte semanal
                                    </DropdownMenu.Item>
                                </DropdownMenu.Content>
                            </DropdownMenu.Root>
                            <Button variant="outline" color="gray" onClick={() => router.visit(route("stock-entries.create"))}>
                                <LuPackagePlus />
                                Crear Nota de Entrada
                            </Button>
                            <Button onClick={() => router.visit(route("notes.create"))}>
                                <LuFilePlus />
                                Crear Nota de Venta
                            </Button>
                        </>
                    }
                />

                {/* Activas / archivadas */}
                <div className="flex items-center gap-1 mb-4 border-b border-ash" role="tablist">
                    {[
                        { label: "Activas", archived: false },
                        { label: "Archivadas", archived: true },
                    ].map((tab) => {
                        const active = tab.archived === archivedParam;
                        return (
                            <Link
                                key={tab.label}
                                href={listUrl(tab.archived)}
                                role="tab"
                                aria-selected={active}
                                className={`-mb-px px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                                    active ? "border-ink text-charcoal" : "border-transparent text-fog hover:text-charcoal"
                                }`}
                            >
                                {tab.label}
                            </Link>
                        );
                    })}
                </div>

                {/* Búsqueda y filtros: una sola fila sobre la tabla */}
                <div className="flex flex-wrap items-center gap-2 mb-4">
                    <div className="w-full sm:w-80">
                        <NoteSearchInput />
                    </div>
                    <DateFilter />
                    <SaleCustomerStatusFilter />
                    <PurchaseStatusFilter />
                    <DeliveryStatusFilter />
                    {hasFiltersApplied && (
                        <Button
                            variant="ghost"
                            color="gray"
                            onClick={() => {
                                setFilterDate("THIS_WEEK");
                                router.get(route("notas"), { ...noFiltersParamValues, date: "THIS_WEEK" });
                            }}
                        >
                            <LuX />
                            Limpiar filtros
                        </Button>
                    )}
                </div>

                {/* Acciones sobre la selección: sólo aparecen cuando hay notas seleccionadas */}
                {selectedItems.length > 0 && (
                    <div className="sticky z-20 flex flex-wrap items-center gap-2 px-3 py-2 mb-3 text-sm text-white top-2 rounded-card bg-ink">
                        <span className="mr-2 font-medium">
                            {selectedItems.length} {selectedItems.length === 1 ? "seleccionada" : "seleccionadas"}
                        </span>
                        {archivedParam ? (
                            <SelectionButton onClick={handleOnUnarchive} icon={<LuArchiveRestore />} label="Desarchivar" />
                        ) : (
                            <SelectionButton onClick={handleOnArchive} icon={<LuArchive />} label="Archivar" />
                        )}
                        <SelectionButton onClick={handleOnDelete} icon={<LuTrash2 />} label="Eliminar" danger />
                        <button
                            type="button"
                            onClick={() => setSelectedItems([])}
                            className="inline-flex items-center gap-1 px-2 py-1 ml-auto text-white/70 hover:text-white rounded-button"
                        >
                            <LuX className="w-4 h-4" />
                            Quitar selección
                        </button>
                    </div>
                )}

                <div className="overflow-x-auto border border-ash rounded-card">
                    <Table.Root>
                        <Table.Header>
                            <Table.Row>
                                <Table.ColumnHeaderCell width="44px">
                                    <Checkbox
                                        aria-label="Seleccionar todas las notas de esta página"
                                        disabled={pageIds.length === 0}
                                        checked={allSelected ? true : someSelected ? "indeterminate" : false}
                                        onCheckedChange={() =>
                                            setSelectedItems(
                                                allSelected
                                                    ? selectedItems.filter((id) => !pageIds.includes(id))
                                                    : Array.from(new Set([...selectedItems, ...pageIds]))
                                            )
                                        }
                                    />
                                </Table.ColumnHeaderCell>
                                <Table.ColumnHeaderCell>No. nota</Table.ColumnHeaderCell>
                                <Table.ColumnHeaderCell>Fecha</Table.ColumnHeaderCell>
                                <Table.ColumnHeaderCell justify="end">Venta</Table.ColumnHeaderCell>
                                <Table.ColumnHeaderCell>Estatus venta</Table.ColumnHeaderCell>
                                <Table.ColumnHeaderCell justify="end">Compra</Table.ColumnHeaderCell>
                                <Table.ColumnHeaderCell>Estatus compra</Table.ColumnHeaderCell>
                                <Table.ColumnHeaderCell>Entrega</Table.ColumnHeaderCell>
                            </Table.Row>
                        </Table.Header>

                        <Table.Body>
                            {notes.map((note) => (
                                <Table.Row
                                    key={note.id}
                                    align="center"
                                    className="cursor-pointer"
                                    onClick={(e: any) => {
                                        if (!(e.target as HTMLElement).closest(".clickable")) {
                                            router.visit(route("notes.show", note.id));
                                        }
                                    }}
                                >
                                    <Table.Cell className="clickable">
                                        <Checkbox
                                            className="clickable"
                                            aria-label={`Seleccionar nota ${note.folio}`}
                                            checked={selectedItems.includes(note.id!)}
                                            onCheckedChange={() => toggle(note.id!)}
                                        />
                                    </Table.Cell>
                                    <Table.Cell className="font-medium text-charcoal">{note.folio}</Table.Cell>
                                    <Table.Cell className="whitespace-nowrap text-steel">{formatDate(note.date)}</Table.Cell>
                                    <Table.Cell justify="end" className="font-medium tabular-nums">
                                        {formatCurrency(note.sale_total)}
                                    </Table.Cell>
                                    <Table.Cell>
                                        <div className="flex">
                                            <StatusPaidBadge status={note.status as payment_status} label={saleLabel(note.status)} />
                                        </div>
                                    </Table.Cell>
                                    <Table.Cell justify="end" className="tabular-nums text-steel">
                                        {formatCurrency(note.purchase_total)}
                                    </Table.Cell>
                                    <Table.Cell>
                                        <div className="flex">
                                            <StatusPaidBadge
                                                status={note.purchase_status as payment_status}
                                                label={note.purchase_status === "pending" ? "Costo pendiente" : "Costo pagado"}
                                            />
                                        </div>
                                    </Table.Cell>
                                    <Table.Cell>
                                        <div className="flex">
                                            <DeliveryStatusBadge status={note.delivery_status as STATUS_DELIVERY_ENUM} />
                                        </div>
                                    </Table.Cell>
                                </Table.Row>
                            ))}
                        </Table.Body>
                    </Table.Root>

                    {notes.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <p className="text-base font-medium text-charcoal">No se encontraron notas</p>
                            <p className="mt-1 text-sm text-fog">
                                {hasFiltersApplied ? "Prueba con otros filtros o limpia la búsqueda." : "Aún no hay notas en este periodo."}
                            </p>
                        </div>
                    )}
                </div>

                <Pagination pagination={pagination} />
            </div>
        </Container>
    );
};

const SelectionButton = ({ onClick, icon, label, danger = false }: { onClick: () => void; icon: JSX.Element; label: string; danger?: boolean }) => (
    <button
        type="button"
        onClick={onClick}
        className={`inline-flex items-center gap-1.5 h-7 px-2.5 font-medium rounded-button border border-white/15 hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 [&>svg]:w-4 [&>svg]:h-4 ${
            danger ? "text-red-300" : "text-white"
        }`}
    >
        {icon}
        {label}
    </button>
);

export default Home;
