import Container from "@/Components/Container";
import Pagination from "@/Components/Pagination";
import { DropdownFilter } from "@/Components/ProductsModal/DropdownFilter/DropdownFilter";
import PageHeader from "@/Components/ui/PageHeader";
import { formatCurrency } from "@/helpers/formatters";
import useAlerts from "@/hooks/useAlerts";
import { useBranch } from "@/hooks/useBranch";
import { useBranchExtra } from "@/hooks/useBranchExtra";
import { PageProps } from "@/types";
import { Product } from "@/types/Product";
import { router } from "@inertiajs/react";
import { Button, Checkbox, DropdownMenu, IconButton, Table } from "@radix-ui/themes";
import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { useCan } from "@/hooks/useCan";
import QuickEditCell, { Move } from "./components/QuickEditCell";
import { confirmAlert } from "react-confirm-alert";
import { LuDownload, LuEllipsis, LuPencil, LuPlus, LuTag, LuTrash2, LuX } from "react-icons/lu";
import ImportProducts from "./ImportProducts";
import BranchExtraDialog from "./components/BranchExtraDialog";
import ProductsSearchInput from "./components/ProductsSearchInput";

interface Props extends PageProps {
    pagination: any;
    brands: {
        brand: string;
    }[];
}

type QuickField = "price" | "cost" | "iva" | "extra" | "stock";

const fieldLabels: Record<QuickField, string> = { price: "precio público", cost: "costo", iva: "IVA", extra: "extra", stock: "existencias" };

const Index = ({ pagination, flash, brands }: Props) => {
    // Copia local para la edición rápida: se actualiza al guardar sin recargar la página.
    const [products, setProducts] = useState<Product[]>(pagination.data);
    useEffect(() => setProducts(pagination.data), [pagination.data]);
    const brandQuery = route().params.brand as string | undefined;

    const [selectedItems, setSelectedItems] = useState<number[]>([]);

    useAlerts(flash);
    const { globalExtra } = useBranchExtra();
    const { currentBranchName } = useBranch();
    const can = useCan();

    // Campos editables en la fila, en el orden en que Tab los recorre. El extra del producto
    // no se edita aquí cuando la sucursal tiene extra global (ese es el que aplica).
    const quickFields: QuickField[] = [
        "price",
        "cost",
        "iva",
        ...(globalExtra === null ? (["extra"] as QuickField[]) : []),
        ...(can("stock.manage") ? (["stock"] as QuickField[]) : []),
    ];
    const [editing, setEditing] = useState<{ id: number; field: QuickField } | null>(null);
    const [saving, setSaving] = useState<Record<string, boolean>>({});
    const [saved, setSaved] = useState<Record<string, boolean>>({});
    const cellKey = (id: number, field: QuickField) => `${id}:${field}`;

    // Si se recarga o se sale mientras una celda se guarda, el navegador cancela el guardado:
    // se avisa antes de salir.
    const anySaving = Object.values(saving).some(Boolean);
    useEffect(() => {
        if (!anySaving) return;
        const warn = (e: BeforeUnloadEvent) => {
            e.preventDefault();
            e.returnValue = "";
        };
        window.addEventListener("beforeunload", warn);
        return () => window.removeEventListener("beforeunload", warn);
    }, [anySaving]);

    const currentValue = (p: Product, field: QuickField): number | null =>
        field === "stock" ? (p.stock?.counted_at ? Number(p.stock.quantity) : null) : Number(p[field] ?? 0);

    const target = (id: number, field: QuickField, move: Move) => {
        const row = products.findIndex((p) => p.id === id);
        const col = quickFields.indexOf(field);
        if (move === "down" && row + 1 < products.length) return { id: products[row + 1].id!, field };
        if (move === "up" && row > 0) return { id: products[row - 1].id!, field };
        if (move === "next") {
            if (col + 1 < quickFields.length) return { id, field: quickFields[col + 1] };
            if (row + 1 < products.length) return { id: products[row + 1].id!, field: quickFields[0] };
        }
        if (move === "prev") {
            if (col > 0) return { id, field: quickFields[col - 1] };
            if (row > 0) return { id: products[row - 1].id!, field: quickFields[quickFields.length - 1] };
        }
        return null;
    };

    const commit = (p: Product, field: QuickField, raw: string, move: Move) => {
        setEditing(target(p.id!, field, move));

        const text = raw.trim().replace(/[$,\s%]/g, "");
        if (text === "") return; // vacío: no se cambia nada
        const value = Number(text);
        if (isNaN(value) || value < 0) {
            toast.error(`El ${fieldLabels[field]} debe ser un número de 0 en adelante.`);
            return;
        }
        const before = currentValue(p, field);
        if (before !== null && Math.abs(value - before) < 0.0001) return;

        const key = cellKey(p.id!, field);
        const previous = p;
        setProducts((rows) =>
            rows.map((r) =>
                r.id !== p.id ? r : field === "stock" ? { ...r, stock: { ...(r.stock as any), quantity: value, counted_at: r.stock?.counted_at ?? "ahora" } } : { ...r, [field]: value }
            )
        );
        setSaving((s) => ({ ...s, [key]: true }));

        axios
            .patch(route("products.quick-update", p.id), { field, value })
            .then(({ data }) => {
                setProducts((rows) =>
                    rows.map((r) =>
                        r.id !== p.id
                            ? r
                            : { ...r, price: data.price, cost: data.cost, iva: data.iva, extra: data.extra, stock: data.stock ? ({ ...(r.stock as any), ...data.stock } as any) : r.stock }
                    )
                );
                setSaved((s) => ({ ...s, [key]: true }));
                setTimeout(() => setSaved((s) => ({ ...s, [key]: false })), 1500);
            })
            .catch((error) => {
                setProducts((rows) => rows.map((r) => (r.id === p.id ? previous : r)));
                const errors = error.response?.data?.errors;
                toast.error((errors && (Object.values(errors)[0] as string[])[0]) ?? error.response?.data?.message ?? "No se pudo guardar. Revisa tu conexión.");
            })
            .finally(() => setSaving((s) => ({ ...s, [key]: false })));
    };

    const quickCell = (p: Product, field: QuickField, display: React.ReactNode, suffix?: string) => (
        <QuickEditCell
            value={currentValue(p, field)}
            display={display}
            editing={editing?.id === p.id && editing?.field === field}
            saving={!!saving[cellKey(p.id!, field)]}
            saved={!!saved[cellKey(p.id!, field)]}
            label={`${fieldLabels[field]} de ${p.brand} ${p.model}`}
            suffix={suffix}
            onStart={() => setEditing({ id: p.id!, field })}
            onCommit={(raw, move) => commit(p, field, raw, move)}
            onCancel={() => setEditing(null)}
        />
    );

    // router (Inertia 2) en lugar del cliente legado: con aquel se recargaba la página
    // completa y el mensaje de "eliminados" se perdía.
    const handleDelete = () => {
        const many = selectedItems.length > 1;
        confirmAlert({
            title: many ? "Eliminar productos" : "Eliminar producto",
            message: many
                ? "¿Estás seguro de que deseas eliminar los productos seleccionados? Esta acción no se puede deshacer."
                : "¿Estás seguro de que deseas eliminar el producto seleccionado? Esta acción no se puede deshacer.",
            buttons: [
                {
                    label: "Eliminar",
                    onClick: () =>
                        router.post(route("products.destroy.items", { ids: selectedItems }), {}, {
                            preserveScroll: true,
                            onSuccess: () => setSelectedItems([]),
                        }),
                },
                { label: "Cancelar" },
            ],
        });
    };

    const handleDeleteAll = () => {
        confirmAlert({
            title: brandQuery ? `Eliminar productos de ${brandQuery}` : "Eliminar todos los productos",
            message: "¿Estás seguro de que deseas eliminar todos los productos? Esta acción no se puede deshacer.",
            buttons: [
                {
                    label: "Eliminar",
                    onClick: () =>
                        router.post(route("products.destroy.all", brandQuery ? { brand: brandQuery } : {})),
                },
                { label: "Cancelar" },
            ],
        });
    };

    // Descarga de archivo: navegación normal, no una visita de Inertia (no es una página).
    const handleExport = () => {
        window.location.href = route("export.products", brandQuery ? { brand: brandQuery } : {});
    };

    const pageIds = products.map((p) => p.id!);
    const allSelected = pageIds.length > 0 && pageIds.every((id) => selectedItems.includes(id));
    const someSelected = selectedItems.length > 0 && !allSelected;
    const toggle = (id: number) =>
        setSelectedItems(selectedItems.includes(id) ? selectedItems.filter((i) => i !== id) : [...selectedItems, id]);

    const brandValues = brands.reduce(
        (acc, curr) => {
            acc[curr.brand] = curr.brand;
            return acc;
        },
        { NONE: "Todas" } as { [key: string]: string }
    );

    return (
        <Container headTitle="Productos">
            <div style={{ minHeight: "calc(100vh - 130px)" }}>
                <PageHeader
                    title="Productos"
                    description={`${pagination.total} ${pagination.total === 1 ? "producto" : "productos"} · existencias de ${currentBranchName}`}
                    actions={
                        <>
                            <BranchExtraDialog />
                            <ImportProducts />
                            <Button variant="outline" color="gray" onClick={handleExport}>
                                <LuDownload />
                                Exportar
                            </Button>
                            <DropdownMenu.Root>
                                <DropdownMenu.Trigger>
                                    <IconButton variant="outline" color="gray" aria-label="Más acciones">
                                        <LuEllipsis />
                                    </IconButton>
                                </DropdownMenu.Trigger>
                                <DropdownMenu.Content align="end" variant="soft" color="gray">
                                    <DropdownMenu.Item color="red" onSelect={handleDeleteAll}>
                                        <LuTrash2 /> Eliminar {brandQuery ? `productos de ${brandQuery}` : "todos los productos"}
                                    </DropdownMenu.Item>
                                </DropdownMenu.Content>
                            </DropdownMenu.Root>
                            <Button onClick={() => router.visit(route("products.create"))}>
                                <LuPlus />
                                Registrar producto
                            </Button>
                        </>
                    }
                />

                <div className="flex flex-wrap items-center gap-2 mb-4">
                    <div className="w-full sm:w-96">
                        <ProductsSearchInput />
                    </div>
                    <DropdownFilter
                        icon={<LuTag />}
                        values={brandValues}
                        paramKey="brand"
                        defaultLabel="Marca"
                        routeName="products"
                        resetPage
                    />
                </div>

                {selectedItems.length > 0 && (
                    <div className="sticky z-20 flex flex-wrap items-center gap-2 px-3 py-2 mb-3 text-sm text-white top-2 rounded-card bg-ink">
                        <span className="mr-2 font-medium">
                            {selectedItems.length} {selectedItems.length === 1 ? "seleccionado" : "seleccionados"}
                        </span>
                        <button
                            type="button"
                            onClick={handleDelete}
                            className="inline-flex items-center gap-1.5 h-7 px-2.5 font-medium text-red-300 border rounded-button border-white/15 hover:bg-white/10"
                        >
                            <LuTrash2 className="w-4 h-4" />
                            Eliminar selección
                        </button>
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

                <p className="flex items-center gap-1.5 mb-2 text-xs text-fog">
                    <LuPencil className="w-3.5 h-3.5" aria-hidden />
                    Da clic en un precio, costo, IVA{globalExtra === null ? ", extra" : ""}
                    {can("stock.manage") ? " o existencias" : ""} para cambiarlo. Enter guarda y baja a la siguiente fila, Tab pasa al siguiente
                    campo y Esc cancela.
                </p>
                <div className="overflow-x-auto border border-ash rounded-card">
                    <Table.Root>
                        <Table.Header>
                            <Table.Row>
                                <Table.ColumnHeaderCell width="44px">
                                    <Checkbox
                                        aria-label="Seleccionar todos los productos de esta página"
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
                                <Table.ColumnHeaderCell>Id</Table.ColumnHeaderCell>
                                <Table.ColumnHeaderCell>Marca</Table.ColumnHeaderCell>
                                <Table.ColumnHeaderCell>Modelo</Table.ColumnHeaderCell>
                                <Table.ColumnHeaderCell>Medida</Table.ColumnHeaderCell>
                                <Table.ColumnHeaderCell>MC</Table.ColumnHeaderCell>
                                <Table.ColumnHeaderCell>Unidad</Table.ColumnHeaderCell>
                                <Table.ColumnHeaderCell justify="end">Precio público</Table.ColumnHeaderCell>
                                <Table.ColumnHeaderCell justify="end">Costo</Table.ColumnHeaderCell>
                                <Table.ColumnHeaderCell justify="end">IVA</Table.ColumnHeaderCell>
                                <Table.ColumnHeaderCell justify="end">Extra</Table.ColumnHeaderCell>
                                <Table.ColumnHeaderCell justify="end">Existencias</Table.ColumnHeaderCell>
                            </Table.Row>
                        </Table.Header>

                        <Table.Body>
                            {products.map((product) => (
                                <Table.Row
                                    key={product.id}
                                    align="center"
                                    className="cursor-pointer"
                                    onClick={(e: any) => {
                                        if (!(e.target as HTMLElement).closest(".clickable")) {
                                            router.visit(route("products.show", product.id));
                                        }
                                    }}
                                >
                                    <Table.Cell className="clickable">
                                        <Checkbox
                                            className="clickable"
                                            aria-label={`Seleccionar ${product.brand} ${product.model}`}
                                            checked={selectedItems.includes(product.id!)}
                                            onCheckedChange={() => toggle(product.id!)}
                                        />
                                    </Table.Cell>
                                    <Table.Cell className="tabular-nums text-fog">{product.id}</Table.Cell>
                                    <Table.Cell className="font-medium text-charcoal">{product.brand}</Table.Cell>
                                    <Table.Cell>{product.model}</Table.Cell>
                                    <Table.Cell className="text-steel">{product.measure}</Table.Cell>
                                    <Table.Cell className="text-steel">{product.mc}</Table.Cell>
                                    <Table.Cell className="text-steel">{product.unit}</Table.Cell>
                                    <Table.Cell justify="end" className="font-medium clickable">
                                        {quickCell(product, "price", formatCurrency(product.price))}
                                    </Table.Cell>
                                    <Table.Cell justify="end" className="text-steel clickable">
                                        {quickCell(product, "cost", formatCurrency(product.cost))}
                                    </Table.Cell>
                                    <Table.Cell justify="end" className="text-steel clickable">
                                        {quickCell(product, "iva", `${Number(product.iva)}%`, "%")}
                                    </Table.Cell>
                                    <Table.Cell justify="end" className={`tabular-nums ${globalExtra === null ? "clickable" : ""}`}>
                                        {globalExtra === null ? (
                                            <span className="text-steel">{quickCell(product, "extra", `${Number(product.extra ?? 0)}%`, "%")}</span>
                                        ) : (
                                            <span title={`Extra global de la sucursal (el del producto es ${product.extra ?? 0}%)`}>
                                                {globalExtra}% <span className="text-xs text-lavender">global</span>
                                            </span>
                                        )}
                                    </Table.Cell>
                                    <Table.Cell justify="end" className={`font-semibold tabular-nums ${can("stock.manage") ? "clickable" : ""}`}>
                                        {(() => {
                                            const display = product.stock?.counted_at ? (
                                                Number(product.stock.quantity)
                                            ) : (
                                                <span className="text-xs font-normal text-fog" title="Aún no se han cargado existencias en esta sucursal">
                                                    sin inventario
                                                </span>
                                            );
                                            return can("stock.manage") ? quickCell(product, "stock", display) : display;
                                        })()}
                                    </Table.Cell>
                                </Table.Row>
                            ))}
                        </Table.Body>
                    </Table.Root>

                    {products.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <p className="text-base font-medium text-charcoal">No se encontraron productos</p>
                            <p className="mt-1 text-sm text-fog">Prueba con otra búsqueda o marca.</p>
                        </div>
                    )}
                </div>

                <Pagination pagination={pagination} />
            </div>
        </Container>
    );
};

export default Index;
