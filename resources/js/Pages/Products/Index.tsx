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
import { useState } from "react";
import { confirmAlert } from "react-confirm-alert";
import { LuDownload, LuEllipsis, LuPlus, LuTag, LuTrash2, LuX } from "react-icons/lu";
import ImportProducts from "./ImportProducts";
import BranchExtraDialog from "./components/BranchExtraDialog";
import ProductsSearchInput from "./components/ProductsSearchInput";

interface Props extends PageProps {
    pagination: any;
    brands: {
        brand: string;
    }[];
}

const Index = ({ pagination, flash, brands }: Props) => {
    const products: Product[] = pagination.data;
    const brandQuery = route().params.brand as string | undefined;

    const [selectedItems, setSelectedItems] = useState<number[]>([]);

    useAlerts(flash);
    const { globalExtra } = useBranchExtra();
    const { currentBranchName } = useBranch();

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
                                    <Table.Cell justify="end" className="font-medium tabular-nums">
                                        {formatCurrency(product.price)}
                                    </Table.Cell>
                                    <Table.Cell justify="end" className="tabular-nums text-steel">
                                        {formatCurrency(product.cost)}
                                    </Table.Cell>
                                    <Table.Cell justify="end" className="tabular-nums text-steel">
                                        {product.iva}%
                                    </Table.Cell>
                                    <Table.Cell justify="end" className="tabular-nums">
                                        {globalExtra === null ? (
                                            <span className="text-steel">{product.extra ?? 0}%</span>
                                        ) : (
                                            <span title={`Extra global de la sucursal (el del producto es ${product.extra ?? 0}%)`}>
                                                {globalExtra}% <span className="text-xs text-lavender">global</span>
                                            </span>
                                        )}
                                    </Table.Cell>
                                    <Table.Cell justify="end" className="font-semibold tabular-nums">
                                        {product.stock?.counted_at ? (
                                            product.stock.quantity
                                        ) : (
                                            <span className="text-xs font-normal text-fog" title="Aún no se han cargado existencias en esta sucursal">
                                                sin inventario
                                            </span>
                                        )}
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
