import Container from "@/Components/Container";
import DeliveryStatusBadge from "@/Components/DeliveryStatusBadge";
import Pagination from "@/Components/Pagination";
import StatusPaidBadge from "@/Components/StatusPaidBadge";
import PageHeader from "@/Components/ui/PageHeader";
import { STATUS_DELIVERY_ENUM } from "@/const";
import { formatCurrency, formatDate } from "@/helpers/formatters";
import useAlerts from "@/hooks/useAlerts";
import { useBranch } from "@/hooks/useBranch";
import { useCan } from "@/hooks/useCan";
import { PageProps, payment_status } from "@/types";
import { Note } from "@/types/Note";
import { Link, router } from "@inertiajs/react";
import SaleSummary, { SummarySale } from "@/Components/SaleSummary";
import { Button, Checkbox, DropdownMenu, Select, Switch, Table, Text } from "@radix-ui/themes";
import { Fragment, MouseEvent, useMemo, useState } from "react";
import { confirmAlert } from "react-confirm-alert";
import {
    LuArchive,
    LuArchiveRestore,
    LuCalculator,
    LuCalendarRange,
    LuChevronDown,
    LuChevronRight,
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

interface NoteItemRow {
    brand: string | null;
    model: string | null;
    measure: string | null;
    mc: string | null;
    unit: string | null;
    quantity: number | string;
    price: number | string;
    discount: number | string | null;
    sale_subtotal: number | string;
    purchase_subtotal?: number | string | null;
}

/** Nota de la lista: con partidas, pagos y vendedor para el resumen desplegable. */
type ListNote = Note & { items: NoteItemRow[]; seller?: { id: number; name: string } | null };

interface Totals {
    count: number;
    canceled: number;
    sale: number;
    collected: number;
    balance: number;
    with_balance: number;
    purchase?: number;
    purchase_pending?: number;
}

type Sort = "folio" | "folio_desc" | "recientes" | "venta_desc" | "saldo_desc";

const SORTS: Record<Sort, string> = {
    folio: "Folio: menor a mayor",
    folio_desc: "Folio: mayor a menor",
    recientes: "Más recientes",
    venta_desc: "Venta más alta",
    saldo_desc: "Mayor saldo por cobrar",
};

interface Props extends PageProps {
    pagination: any;
    branch: Branch;
    totals: Totals;
    sort: Sort;
    withBalance: boolean;
    today: string;
}

const isCanceled = (n: Note) => n.status === "canceled" || n.delivery_status === "cancelado";

/** Convierte la nota de la lista al formato del resumen compartido (SaleSummary). */
const toSummary = (n: ListNote): SummarySale => ({
    folio: n.folio,
    customer: n.customer,
    customer_phone: n.customer_phone ?? null,
    customer_address: n.customer_address ?? null,
    sale_total: Number(n.sale_total ?? 0),
    discount: Number(n.discount ?? 0),
    flete: Number(n.flete ?? 0),
    cash: Number(n.cash ?? 0),
    cash_received: n.cash_received !== null && n.cash_received !== undefined ? Number(n.cash_received) : null,
    balance: Number(n.balance ?? 0),
    canceled: isCanceled(n),
    lines: (n.items ?? []).map((i) => ({
        quantity: Number(i.quantity),
        description: [i.brand, i.model, i.measure].filter(Boolean).join(" "),
        mc: i.mc,
        price: Number(i.price ?? 0),
        discount: Number(i.discount ?? 0),
        amount: Number(i.sale_subtotal ?? 0),
        purchase: i.purchase_subtotal !== undefined && i.purchase_subtotal !== null ? Number(i.purchase_subtotal) : null,
    })),
    payments: (n.payments ?? []).map((p: any) => ({
        date: String(p.date).slice(0, 10),
        cash: Number(p.cash ?? 0),
        card: Number(p.card ?? 0),
        card_type: p.card_type ?? null,
        transfer: Number(p.transfer ?? 0),
    })),
});

const Tile = ({ label, value, hint, tone }: { label: string; value: number; hint?: string; tone?: "amber" }) => (
    <div className={`p-3 border rounded-card ${tone === "amber" ? "bg-amber-tint border-transparent" : "bg-white border-ash"}`}>
        <div className={`text-xs font-medium ${tone === "amber" ? "text-amber-900" : "text-steel"}`}>{label}</div>
        <div className={`mt-1 text-xl font-semibold tabular-nums ${tone === "amber" ? "text-amber-900" : "text-charcoal"}`}>{formatCurrency(value)}</div>
        {hint && <div className={`text-xs ${tone === "amber" ? "text-amber-900/80" : "text-fog"}`}>{hint}</div>}
    </div>
);

const saleLabel = (status: string) =>
    status === "pending" ? "Pendiente" : status === "paid" ? "Pagado" : "Cancelado";

const Home = ({ pagination, flash, totals, sort, withBalance, today }: Props) => {
    const notes: ListNote[] = pagination.data;
    const can = useCan();
    const seeCosts = can("costs.view");

    // Resumen desplegable de cada nota.
    const [open, setOpen] = useState<Set<number>>(new Set());
    const toggleOpen = (id: number) =>
        setOpen((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    const allOpen = notes.length > 0 && notes.every((n) => open.has(n.id!));

    // Orden y "sólo con saldo": se agregan a los filtros actuales de la URL.
    const setParam = (changes: Record<string, string | number | null>) => {
        const params: Record<string, any> = { ...route().params, ...changes };
        delete params.page;
        Object.keys(params).forEach((k) => (params[k] === null || params[k] === "" ? delete params[k] : null));
        router.get(route("notas"), params, { preserveScroll: true });
    };

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
        return Object.keys(params).some((key) => !noFilterParams.includes(key) && key !== "sort") && params.date !== "THIS_WEEK";
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

    // Cobro: pagada, o lo que dejaron a cuenta y lo que resta.
    const collection = (note: ListNote) => {
        if (isCanceled(note)) return <StatusPaidBadge status={"canceled" as payment_status} label="Cancelada" />;
        const balance = Number(note.balance ?? 0);
        if (balance > 0.009) {
            return (
                <div className="text-xs leading-tight">
                    <div className="text-steel">
                        A cuenta <span className="font-medium tabular-nums text-charcoal">{formatCurrency(note.advance)}</span>
                    </div>
                    <div className="font-semibold text-amber-800">
                        Resta <span className="tabular-nums">{formatCurrency(balance)}</span>
                    </div>
                </div>
            );
        }
        return <StatusPaidBadge status={note.status as payment_status} label={saleLabel(note.status)} />;
    };

    const noteExtra = (note: ListNote) =>
        note.seller?.name || note.notes ? (
            <>
                {note.seller?.name && <div>Vendió: {note.seller.name}</div>}
                {note.notes && <div className="mt-0.5 whitespace-pre-line">Notas: {note.notes}</div>}
            </>
        ) : undefined;

    const listUrl = (archived: boolean) =>
        route("notas", {
            ...(archived ? { archived: true } : {}),
            date: route().params.date ?? filterDate,
            // Un rango propio se conserva al cambiar de pestaña.
            ...(route().params.desde ? { desde: route().params.desde } : {}),
            ...(route().params.hasta ? { hasta: route().params.hasta } : {}),
        });

    return (
        <Container headTitle="Notas">
            <div style={{ minHeight: "calc(100vh - 130px)" }}>
                <PageHeader
                    eyebrow={branch?.name}
                    title={archivedParam ? "Notas archivadas" : "Notas"}
                    description={`${totals.count} ${totals.count === 1 ? "nota" : "notas"}${totals.canceled > 0 ? ` · ${totals.canceled} cancelada${totals.canceled === 1 ? "" : "s"} (no suman)` : ""}`}
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

                <div className="flex flex-wrap items-center gap-3 mb-4">
                    <Select.Root value={sort} onValueChange={(v) => setParam({ sort: v === "folio" ? null : v })}>
                        <Select.Trigger aria-label="Ordenar" variant="surface" />
                        <Select.Content position="popper">
                            {(Object.keys(SORTS) as Sort[]).map((k) => (
                                <Select.Item key={k} value={k}>
                                    {SORTS[k]}
                                </Select.Item>
                            ))}
                        </Select.Content>
                    </Select.Root>
                    <Text as="label" size="2" className="inline-flex items-center gap-2 text-steel">
                        <Switch size="1" checked={withBalance} onCheckedChange={(v) => setParam({ saldo: v ? 1 : null })} />
                        Sólo con saldo por cobrar
                    </Text>
                </div>

                {/* Totales del periodo filtrado (todas las páginas); las canceladas no suman */}
                <div className={`grid grid-cols-2 gap-3 mb-4 ${seeCosts ? "sm:grid-cols-4" : "sm:grid-cols-3"}`}>
                    <Tile label="Venta" value={totals.sale} hint={`${totals.count - totals.canceled} ${totals.count - totals.canceled === 1 ? "nota" : "notas"}`} />
                    <Tile label="Cobrado" value={totals.collected} hint="anticipos y pagos" />
                    <Tile
                        label="Por cobrar"
                        value={totals.balance}
                        hint={totals.with_balance > 0 ? `${totals.with_balance} ${totals.with_balance === 1 ? "nota con saldo" : "notas con saldo"}` : "nada pendiente"}
                        tone={totals.with_balance > 0 ? "amber" : undefined}
                    />
                    {seeCosts && (
                        <Tile
                            label="Compra"
                            value={totals.purchase ?? 0}
                            hint={(totals.purchase_pending ?? 0) > 0.009 ? `${formatCurrency(totals.purchase_pending ?? 0)} por pagar` : "todo pagado"}
                        />
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

                {notes.length > 0 && (
                    <div className="flex items-center justify-between gap-2 mb-2">
                        <p className="text-xs text-fog">
                            <span className="hidden md:inline">La flecha muestra el resumen de la nota; clic en la fila la abre.</span>
                            <span className="md:hidden">Toca una nota para ver su resumen.</span>
                        </p>
                        <Button size="1" variant="ghost" color="gray" onClick={() => setOpen(allOpen ? new Set() : new Set(notes.map((n) => n.id!)))}>
                            {allOpen ? "Ocultar detalle" : "Ver detalle de todas"}
                        </Button>
                    </div>
                )}

                {/* Escritorio: tabla */}
                <div className="hidden overflow-x-auto border md:block border-ash rounded-card">
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
                                <Table.ColumnHeaderCell>Cliente</Table.ColumnHeaderCell>
                                <Table.ColumnHeaderCell justify="end">Venta</Table.ColumnHeaderCell>
                                <Table.ColumnHeaderCell>Cobro</Table.ColumnHeaderCell>
                                {seeCosts && <Table.ColumnHeaderCell justify="end">Compra</Table.ColumnHeaderCell>}
                                <Table.ColumnHeaderCell>Entrega</Table.ColumnHeaderCell>
                            </Table.Row>
                        </Table.Header>

                        <Table.Body>
                            {notes.map((note) => {
                                const canceled = isCanceled(note);
                                const expanded = open.has(note.id!);
                                return (
                                    <Fragment key={note.id}>
                                        <Table.Row
                                            align="center"
                                            className={`cursor-pointer hover:bg-paper/60 ${expanded ? "bg-paper/60" : ""} ${canceled ? "opacity-60" : ""}`}
                                            onClick={(e: MouseEvent<HTMLTableRowElement>) => {
                                                // Los clics de menús (portales) también llegan a la fila: sólo cuentan los de adentro.
                                                if (!e.currentTarget.contains(e.target as Node)) return;
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
                                            <Table.Cell className="font-medium whitespace-nowrap text-charcoal">
                                                <button
                                                    type="button"
                                                    aria-expanded={expanded}
                                                    aria-label={`Resumen de la nota ${note.folio}`}
                                                    onClick={() => toggleOpen(note.id!)}
                                                    className="inline-flex items-center justify-center w-5 h-5 mr-1 align-middle rounded clickable text-fog hover:text-charcoal hover:bg-ash/60"
                                                >
                                                    {expanded ? <LuChevronDown className="clickable" /> : <LuChevronRight className="clickable" />}
                                                </button>
                                                {note.folio}
                                            </Table.Cell>
                                            <Table.Cell className="whitespace-nowrap text-steel">{formatDate(note.date)}</Table.Cell>
                                            <Table.Cell>
                                                <div className="text-charcoal">{note.customer || "—"}</div>
                                                <div className="text-xs text-fog">
                                                    {[
                                                        note.customer_phone && `Tel. ${note.customer_phone}`,
                                                        `${note.items?.length ?? 0} ${note.items?.length === 1 ? "producto" : "productos"}`,
                                                        note.seller?.name,
                                                    ]
                                                        .filter(Boolean)
                                                        .join(" · ")}
                                                </div>
                                            </Table.Cell>
                                            <Table.Cell justify="end" className={`font-semibold tabular-nums ${canceled ? "line-through text-fog" : "text-charcoal"}`}>
                                                {formatCurrency(note.sale_total)}
                                            </Table.Cell>
                                            <Table.Cell>{collection(note)}</Table.Cell>
                                            {seeCosts && (
                                                <Table.Cell justify="end">
                                                    <div className="tabular-nums text-steel">{formatCurrency(note.purchase_total)}</div>
                                                    <div className="flex justify-end mt-0.5">
                                                        <StatusPaidBadge
                                                            status={note.purchase_status as payment_status}
                                                            label={note.purchase_status === "pending" ? "Por pagar" : "Pagada"}
                                                        />
                                                    </div>
                                                </Table.Cell>
                                            )}
                                            <Table.Cell>
                                                <div className="flex">
                                                    <DeliveryStatusBadge status={note.delivery_status as STATUS_DELIVERY_ENUM} />
                                                </div>
                                            </Table.Cell>
                                        </Table.Row>
                                        {expanded && (
                                            <Table.Row className="bg-paper/40">
                                                <Table.Cell colSpan={seeCosts ? 8 : 7} className="!p-0">
                                                    <SaleSummary sale={toSummary(note)} today={today} showPurchase={seeCosts} extra={noteExtra(note)} />
                                                </Table.Cell>
                                            </Table.Row>
                                        )}
                                    </Fragment>
                                );
                            })}
                        </Table.Body>
                    </Table.Root>
                </div>

                {/* Celular: tarjetas con el resumen adentro */}
                <ul className="space-y-2 md:hidden">
                    {notes.map((note) => {
                        const canceled = isCanceled(note);
                        const expanded = open.has(note.id!);
                        return (
                            <li key={note.id} className={`bg-white border border-ash rounded-card ${canceled ? "opacity-60" : ""}`}>
                                <div className="flex items-start gap-3 p-3">
                                    <Checkbox
                                        className="mt-1"
                                        aria-label={`Seleccionar nota ${note.folio}`}
                                        checked={selectedItems.includes(note.id!)}
                                        onCheckedChange={() => toggle(note.id!)}
                                    />
                                    <button type="button" onClick={() => toggleOpen(note.id!)} aria-expanded={expanded} className="flex-1 min-w-0 text-left">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <div className="font-medium text-charcoal">
                                                    Folio {note.folio} <span className="font-normal text-fog">· {formatDate(note.date)}</span>
                                                </div>
                                                <div className="text-sm truncate text-steel">{note.customer || "—"}</div>
                                            </div>
                                            <div className="flex items-start gap-1 shrink-0">
                                                <span className={`font-semibold tabular-nums ${canceled ? "line-through text-fog" : "text-charcoal"}`}>{formatCurrency(note.sale_total)}</span>
                                                {expanded ? <LuChevronDown className="mt-1 text-fog" /> : <LuChevronRight className="mt-1 text-fog" />}
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2 mt-2 text-xs">
                                            {collection(note)}
                                            <DeliveryStatusBadge status={note.delivery_status as STATUS_DELIVERY_ENUM} />
                                        </div>
                                    </button>
                                </div>
                                {expanded && (
                                    <div className="border-t border-ash bg-paper/40">
                                        <SaleSummary sale={toSummary(note)} today={today} showPurchase={seeCosts} extra={noteExtra(note)} />
                                        <div className="px-4 pb-3">
                                            <Button size="2" variant="soft" onClick={() => router.visit(route("notes.show", note.id))}>
                                                Abrir nota
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </li>
                        );
                    })}
                </ul>

                {notes.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 text-center border border-ash rounded-card">
                        <p className="text-base font-medium text-charcoal">No se encontraron notas</p>
                        <p className="mt-1 text-sm text-fog">
                            {hasFiltersApplied || withBalance ? "Prueba con otros filtros o limpia la búsqueda." : "Aún no hay notas en este periodo."}
                        </p>
                    </div>
                )}

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
