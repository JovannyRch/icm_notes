import Container from "@/Components/Container";
import Pagination from "@/Components/Pagination";
import PageHeader from "@/Components/ui/PageHeader";
import { formatCurrency } from "@/helpers/formatters";
import useAlerts from "@/hooks/useAlerts";
import { useBranch } from "@/hooks/useBranch";
import { useBranchExtra } from "@/hooks/useBranchExtra";
import { PageProps } from "@/types";
import { Product } from "@/types/Product";
import { router } from "@inertiajs/react";
import { Button, Checkbox, DropdownMenu, IconButton, Select } from "@radix-ui/themes";
import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { useCan } from "@/hooks/useCan";
import { effectiveExtra, showsStock } from "@/helpers/utils";
import QuickEditCell, { Move } from "./components/QuickEditCell";
import { confirmAlert } from "react-confirm-alert";
import {
    LuCopy,
    LuDownload,
    LuEllipsis,
    LuPackageSearch,
    LuPencil,
    LuPercent,
    LuPlus,
    LuSearch,
    LuShoppingCart,
    LuTrash2,
    LuX,
} from "react-icons/lu";
import ImportProducts from "./ImportProducts";
import BranchExtraDialog from "./components/BranchExtraDialog";
import BulkPriceDialog from "./components/BulkPriceDialog";

type Status = "sin_precio" | "sin_costo" | "con_perdida" | "agotados" | "sin_inventario" | "con_existencias";
type Sort = "id" | "marca" | "precio_asc" | "precio_desc" | "existencias" | "recientes";

interface Filters {
    query: string;
    brand: string | null;
    estado: Status | null;
    sort: Sort;
}

interface Summary extends Record<Status, number> {
    total: number;
    stock_units: number;
    stock_price: number;
    stock_cost: number;
}

interface Props extends PageProps {
    pagination: any;
    brands: string[];
    filters: Filters;
    summary: Summary;
}

type QuickField = "price" | "cost" | "iva" | "extra" | "stock";

const fieldLabels: Record<QuickField, string> = { price: "precio público", cost: "costo", iva: "IVA", extra: "extra", stock: "existencias" };

// Filtros de estado (mismas claves que ProductController::STATUSES). tone: color del conteo cuando hay.
const STATUSES: { key: Status; label: string; hint: string; tone?: "warn" | "bad" }[] = [
    { key: "sin_precio", label: "Sin precio", hint: "Precio público en $0: la caja no los deja cobrar", tone: "warn" },
    { key: "con_perdida", label: "Con pérdida", hint: "El precio público es menor que el costo con IVA y extra", tone: "bad" },
    { key: "sin_costo", label: "Sin costo", hint: "Costo en $0: el margen y la compra salen incompletos", tone: "warn" },
    { key: "agotados", label: "Agotados", hint: "Existencias en 0 o negativas en esta sucursal", tone: "bad" },
    { key: "con_existencias", label: "Con existencias", hint: "Tienen piezas en esta sucursal" },
    { key: "sin_inventario", label: "Sin inventario", hint: "Nunca se han contado en esta sucursal" },
];

const SORTS: Record<Sort, string> = {
    id: "Orden de registro",
    marca: "Marca y modelo",
    precio_asc: "Precio: menor a mayor",
    precio_desc: "Precio: mayor a menor",
    existencias: "Más existencias",
    recientes: "Modificados recientemente",
};

const ALL = "__all__";
const qty = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2));
const m2PerBox = (p: Product) => {
    const mc = Number(String(p.mc ?? "").replace(",", "."));
    return p.mc && !isNaN(mc) && mc > 0 ? mc : null;
};

const Index = ({ pagination, flash, brands, filters, summary }: Props) => {
    // Copia local para la edición rápida: se actualiza al guardar sin recargar la página.
    const [products, setProducts] = useState<Product[]>(pagination.data);
    useEffect(() => setProducts(pagination.data), [pagination.data]);
    const brandQuery = filters.brand ?? undefined;

    const [selectedItems, setSelectedItems] = useState<number[]>([]);
    const [bulk, setBulk] = useState<"selection" | "brand" | null>(null);

    useAlerts(flash);
    const { globalExtra } = useBranchExtra();
    const { currentBranchName } = useBranch();
    const can = useCan();

    // --- Filtros (en la URL: se pueden compartir y sobreviven a recargar) ------------
    const [search, setSearch] = useState(filters.query ?? "");
    const searchRef = useRef<HTMLInputElement>(null);
    const firstRender = useRef(true);

    const apply = (changes: Partial<Filters>) => {
        const next = { ...filters, query: search, ...changes };
        setSelectedItems([]);
        router.get(
            route("products"),
            {
                ...(next.query ? { query: next.query } : {}),
                ...(next.brand ? { brand: next.brand } : {}),
                ...(next.estado ? { estado: next.estado } : {}),
                ...(next.sort !== "id" ? { sort: next.sort } : {}),
            },
            { preserveState: true, preserveScroll: true, replace: true }
        );
    };

    // Búsqueda mientras se escribe, con una espera corta.
    useEffect(() => {
        if (firstRender.current) {
            firstRender.current = false;
            return;
        }
        const t = setTimeout(() => apply({ query: search.trim() }), 300);
        return () => clearTimeout(t);
    }, [search]);

    // "/" enfoca el buscador desde cualquier parte de la página.
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const typing = ["INPUT", "TEXTAREA", "SELECT"].includes((e.target as HTMLElement).tagName);
            if (e.key === "/" && !typing) {
                e.preventDefault();
                searchRef.current?.focus();
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, []);

    const hasFilters = !!(filters.query || filters.brand || filters.estado);

    // --- Margen: con el costo real (IVA y extra, el global de la sucursal si existe) --
    const realCost = (p: Product) => Number(p.cost ?? 0) * (1 + Number(p.iva ?? 0) / 100) * (1 + effectiveExtra(p.extra, globalExtra) / 100);
    const margin = (p: Product) => {
        const price = Number(p.price ?? 0);
        if (price <= 0 || Number(p.cost ?? 0) <= 0) return null;
        return { percent: ((price - realCost(p)) / price) * 100, profit: price - realCost(p), cost: realCost(p) };
    };

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
        field === "stock" ? (showsStock(p.stock?.quantity, p.stock?.counted_at) ? Number(p.stock!.quantity) : null) : Number(p[field] ?? 0);

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
    const deleteIds = (ids: number[], onSuccess?: () => void) => {
        const many = ids.length > 1;
        confirmAlert({
            title: many ? "Eliminar productos" : "Eliminar producto",
            message: many
                ? `¿Eliminar los ${ids.length} productos seleccionados? Las notas que ya los tienen no cambian. Esta acción no se puede deshacer.`
                : "¿Eliminar este producto? Las notas que ya lo tienen no cambian. Esta acción no se puede deshacer.",
            buttons: [
                {
                    label: "Eliminar",
                    onClick: () => router.post(route("products.destroy.items", { ids }), {}, { preserveScroll: true, onSuccess }),
                },
                { label: "Cancelar" },
            ],
        });
    };

    const handleDeleteAll = () => {
        confirmAlert({
            title: brandQuery ? `Eliminar productos de ${brandQuery}` : "Eliminar todos los productos",
            message: brandQuery
                ? `¿Eliminar todos los productos de ${brandQuery}? Esta acción no se puede deshacer.`
                : "¿Eliminar TODOS los productos del catálogo? Esta acción no se puede deshacer.",
            buttons: [
                {
                    label: "Eliminar",
                    onClick: () => router.post(route("products.destroy.all", brandQuery ? { brand: brandQuery } : {})),
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

    const open = (p: Product) => router.visit(route("products.show", p.id));

    const stockDisplay = (product: Product) =>
        showsStock(product.stock?.quantity, product.stock?.counted_at) ? (
            <span
                className={Number(product.stock!.quantity) <= 0 ? "text-red-700" : undefined}
                title={!product.stock?.counted_at ? "Se ha vendido sin existencias cargadas: se descuenta desde 0" : undefined}
            >
                {qty(Number(product.stock!.quantity))}
            </span>
        ) : (
            <span className="text-xs font-normal text-fog" title="Aún no se han cargado existencias en esta sucursal">
                sin inventario
            </span>
        );

    const marginDisplay = (p: Product) => {
        const m = margin(p);
        if (!m) return <span className="text-xs text-fog">—</span>;
        const tone = m.percent < 0 ? "text-red-700 font-semibold" : m.percent < 15 ? "text-amber-700" : "text-green-700";
        return (
            <span
                className={`tabular-nums ${tone}`}
                title={`Ganancia por ${p.unit?.toLowerCase() || "unidad"}: ${formatCurrency(m.profit)} (costo con IVA y extra: ${formatCurrency(m.cost)})`}
            >
                {m.percent.toFixed(0)}%
            </span>
        );
    };

    const rowMenu = (p: Product) => (
        <DropdownMenu.Root>
            <DropdownMenu.Trigger>
                <IconButton size="1" variant="ghost" color="gray" aria-label={`Acciones de ${p.brand} ${p.model}`}>
                    <LuEllipsis />
                </IconButton>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content align="end" variant="soft" color="gray">
                <DropdownMenu.Item onSelect={() => open(p)}>
                    <LuPencil /> Editar y ver movimientos
                </DropdownMenu.Item>
                <DropdownMenu.Item onSelect={() => router.visit(route("products.create", { duplicar: p.id }))}>
                    <LuCopy /> Duplicar (p. ej. otro m²/caja)
                </DropdownMenu.Item>
                {can("sales.create") && (
                    <DropdownMenu.Item onSelect={() => router.visit(route("caja", { agregar: p.id }))}>
                        <LuShoppingCart /> Vender en caja
                    </DropdownMenu.Item>
                )}
                <DropdownMenu.Separator />
                <DropdownMenu.Item color="red" onSelect={() => deleteIds([p.id!])}>
                    <LuTrash2 /> Eliminar
                </DropdownMenu.Item>
            </DropdownMenu.Content>
        </DropdownMenu.Root>
    );

    const selectedOnPage = products.filter((p) => selectedItems.includes(p.id!));

    return (
        <Container headTitle="Productos">
            <div style={{ minHeight: "calc(100vh - 130px)" }}>
                <PageHeader
                    title="Productos"
                    description={`${summary.total} ${summary.total === 1 ? "producto" : "productos"}${hasFilters ? " con estos filtros" : ""} · existencias de ${currentBranchName}`}
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
                                    {brandQuery ? (
                                        <DropdownMenu.Item onSelect={() => setBulk("brand")}>
                                            <LuPercent /> Ajustar precios de {brandQuery}
                                        </DropdownMenu.Item>
                                    ) : (
                                        <DropdownMenu.Item disabled>
                                            <LuPercent /> Ajustar precios: elige una marca o selecciona productos
                                        </DropdownMenu.Item>
                                    )}
                                    <DropdownMenu.Separator />
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

                {/* Buscar, marca y orden */}
                <div className="flex flex-wrap items-center gap-2 mb-3">
                    <div className="relative w-full sm:w-[360px]">
                        <LuSearch className="absolute w-4 h-4 -translate-y-1/2 pointer-events-none left-3 top-1/2 text-fog" aria-hidden />
                        <input
                            ref={searchRef}
                            type="search"
                            aria-label="Buscar productos"
                            placeholder="Marca, modelo, medida, m² o precio…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={(e) => e.key === "Escape" && setSearch("")}
                            className="w-full h-10 pr-10 text-sm bg-white border pl-9 rounded-input border-pebble text-charcoal placeholder:text-fog focus:border-electric focus:ring-2 focus:ring-electric/20"
                        />
                        <kbd className="absolute hidden px-1.5 text-[11px] -translate-y-1/2 border sm:block right-2.5 top-1/2 rounded border-ash text-fog bg-paper">/</kbd>
                    </div>

                    <Select.Root value={filters.brand ?? ALL} onValueChange={(v) => apply({ brand: v === ALL ? null : v })}>
                        <Select.Trigger aria-label="Marca" variant="surface" />
                        <Select.Content position="popper">
                            <Select.Item value={ALL}>Todas las marcas</Select.Item>
                            {brands.map((b) => (
                                <Select.Item key={b} value={b}>
                                    {b}
                                </Select.Item>
                            ))}
                        </Select.Content>
                    </Select.Root>

                    <Select.Root value={filters.sort} onValueChange={(v) => apply({ sort: v as Sort })}>
                        <Select.Trigger aria-label="Ordenar" variant="surface" />
                        <Select.Content position="popper">
                            {(Object.keys(SORTS) as Sort[]).map((k) => (
                                <Select.Item key={k} value={k}>
                                    {SORTS[k]}
                                </Select.Item>
                            ))}
                        </Select.Content>
                    </Select.Root>

                    {hasFilters && (
                        <button
                            type="button"
                            onClick={() => {
                                setSearch("");
                                apply({ query: "", brand: null, estado: null });
                            }}
                            className="inline-flex items-center h-8 gap-1 px-2 text-sm rounded-button text-fog hover:text-charcoal"
                        >
                            <LuX className="w-4 h-4" aria-hidden /> Quitar filtros
                        </button>
                    )}
                </div>

                {/* Filtros de estado con su conteo: lo que hay que revisar, a la vista */}
                <div className="flex flex-wrap gap-2 mb-3" role="group" aria-label="Filtrar por estado">
                    {STATUSES.map((st) => {
                        const active = filters.estado === st.key;
                        const n = summary[st.key];
                        const countTone = active ? "bg-white/20 text-white" : n > 0 && st.tone === "bad" ? "bg-rose-tint text-red-800" : n > 0 && st.tone === "warn" ? "bg-amber-tint text-amber-900" : "bg-paper text-steel";
                        return (
                            <button
                                key={st.key}
                                type="button"
                                aria-pressed={active}
                                title={st.hint}
                                onClick={() => apply({ estado: active ? null : st.key })}
                                className={`inline-flex items-center gap-2 h-8 pl-3 pr-1.5 text-sm border rounded-full transition-colors ${
                                    active ? "bg-ink border-ink text-white" : "bg-white border-ash text-charcoal hover:border-pebble"
                                }`}
                            >
                                {st.label}
                                <span className={`min-w-[22px] px-1.5 py-0.5 text-xs font-semibold leading-none rounded-full tabular-nums ${countTone}`}>{n}</span>
                            </button>
                        );
                    })}
                </div>

                {summary.stock_units > 0 && (
                    <p className="mb-4 text-sm text-steel">
                        Inventario en {currentBranchName}: <b className="font-medium tabular-nums text-charcoal">{qty(summary.stock_units)}</b> piezas ·{" "}
                        <b className="font-medium tabular-nums text-charcoal">{formatCurrency(summary.stock_price)}</b> a precio público ·{" "}
                        <b className="font-medium tabular-nums text-charcoal">{formatCurrency(summary.stock_cost)}</b> a costo
                    </p>
                )}

                {selectedItems.length > 0 && (
                    <div className="sticky z-20 flex flex-wrap items-center gap-2 px-3 py-2 mb-3 text-sm text-white top-2 rounded-card bg-ink">
                        <span className="mr-2 font-medium">
                            {selectedItems.length} {selectedItems.length === 1 ? "seleccionado" : "seleccionados"}
                        </span>
                        <button
                            type="button"
                            onClick={() => setBulk("selection")}
                            className="inline-flex items-center gap-1.5 h-7 px-2.5 font-medium border rounded-button border-white/15 hover:bg-white/10"
                        >
                            <LuPercent className="w-4 h-4" />
                            Ajustar precios
                        </button>
                        <button
                            type="button"
                            onClick={() => deleteIds(selectedItems, () => setSelectedItems([]))}
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

                {products.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center border border-ash rounded-card">
                        <LuPackageSearch className="w-8 h-8 mb-3 text-fog" aria-hidden />
                        <p className="text-base font-medium text-charcoal">No se encontraron productos</p>
                        <p className="mt-1 text-sm text-fog">{hasFilters ? "Prueba con otra búsqueda, otra marca o quita el filtro." : "Registra un producto o importa tu lista en Excel."}</p>
                    </div>
                ) : (
                    <>
                        <p className="hidden md:flex items-center gap-1.5 mb-2 text-xs text-fog">
                            <LuPencil className="w-3.5 h-3.5" aria-hidden />
                            Clic en precio, costo, IVA{globalExtra === null ? ", extra" : ""}
                            {can("stock.manage") ? " o existencias" : ""} para cambiarlo: Enter guarda y baja, Tab pasa al siguiente campo, Esc cancela.
                        </p>

                        {/* Escritorio: tabla con edición rápida */}
                        <div className="hidden overflow-x-auto bg-white border md:block border-ash rounded-card">
                            <table className="w-full text-sm">
                                <thead className="text-xs text-left border-b text-fog border-ash bg-paper">
                                    <tr>
                                        <th className="w-11 px-3 py-2.5">
                                            <Checkbox
                                                aria-label="Seleccionar todos los productos de esta página"
                                                checked={allSelected ? true : someSelected ? "indeterminate" : false}
                                                onCheckedChange={() =>
                                                    setSelectedItems(
                                                        allSelected ? selectedItems.filter((id) => !pageIds.includes(id)) : Array.from(new Set([...selectedItems, ...pageIds]))
                                                    )
                                                }
                                            />
                                        </th>
                                        <th className="px-3 py-2.5 font-medium">Producto</th>
                                        <th className="px-3 py-2.5 font-medium">Presentación</th>
                                        <th className="px-3 py-2.5 font-medium text-right">Precio público</th>
                                        <th className="px-3 py-2.5 font-medium text-right">Costo</th>
                                        <th className="px-3 py-2.5 font-medium text-right">IVA</th>
                                        <th className="px-3 py-2.5 font-medium text-right">Extra</th>
                                        <th className="px-3 py-2.5 font-medium text-right" title="(precio − costo con IVA y extra) ÷ precio">
                                            Margen
                                        </th>
                                        <th className="px-3 py-2.5 font-medium text-right">Existencias</th>
                                        <th className="w-10 px-2 py-2.5" />
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-ash">
                                    {products.map((product) => {
                                        const mc = m2PerBox(product);
                                        const selected = selectedItems.includes(product.id!);
                                        return (
                                            <tr
                                                key={product.id}
                                                className={`cursor-pointer ${selected ? "bg-sky-tint/60" : "hover:bg-paper/60"}`}
                                                onClick={(e) => {
                                                    // Los clics de menús (portales) también llegan a la fila: sólo cuentan los de adentro.
                                                    if (!e.currentTarget.contains(e.target as Node)) return;
                                                    if (!(e.target as HTMLElement).closest(".clickable")) open(product);
                                                }}
                                            >
                                                <td className="px-3 py-2 clickable">
                                                    <Checkbox
                                                        aria-label={`Seleccionar ${product.brand} ${product.model}`}
                                                        checked={selected}
                                                        onCheckedChange={() => toggle(product.id!)}
                                                    />
                                                </td>
                                                <td className="px-3 py-2">
                                                    <div className="font-medium text-charcoal">
                                                        <span>{product.brand}</span> <span>{product.model}</span>
                                                    </div>
                                                    <div className="text-xs text-fog">
                                                        {product.measure ? `${product.measure} · ` : ""}#{product.id}
                                                    </div>
                                                </td>
                                                <td className="px-3 py-2 text-steel whitespace-nowrap">
                                                    {mc ? <span className="tabular-nums">{qty(mc)} m²/caja</span> : product.mc}
                                                    {(mc || product.mc) && product.unit ? " · " : null}
                                                    {product.unit}
                                                </td>
                                                <td className="px-3 py-2 text-right clickable">
                                                    <div className="font-medium">
                                                        {quickCell(
                                                            product,
                                                            "price",
                                                            Number(product.price ?? 0) > 0 ? formatCurrency(product.price) : <span className="font-medium text-amber-700">Sin precio</span>
                                                        )}
                                                    </div>
                                                    {mc && Number(product.price) > 0 && (
                                                        <div className="text-xs tabular-nums text-fog">{formatCurrency(Number(product.price) / mc)} / m²</div>
                                                    )}
                                                </td>
                                                <td className="px-3 py-2 text-right text-steel clickable">{quickCell(product, "cost", formatCurrency(product.cost))}</td>
                                                <td className="px-3 py-2 text-right text-steel clickable">{quickCell(product, "iva", `${Number(product.iva ?? 0)}%`, "%")}</td>
                                                <td className={`px-3 py-2 text-right tabular-nums ${globalExtra === null ? "clickable" : ""}`}>
                                                    {globalExtra === null ? (
                                                        <span className="text-steel">{quickCell(product, "extra", `${Number(product.extra ?? 0)}%`, "%")}</span>
                                                    ) : (
                                                        <span title={`Extra global de la sucursal (el del producto es ${product.extra ?? 0}%)`}>
                                                            {globalExtra}% <span className="text-xs text-lavender">global</span>
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-3 py-2 text-right">{marginDisplay(product)}</td>
                                                <td className={`px-3 py-2 text-right font-semibold tabular-nums ${can("stock.manage") ? "clickable" : ""}`}>
                                                    {can("stock.manage") ? quickCell(product, "stock", stockDisplay(product)) : stockDisplay(product)}
                                                </td>
                                                <td className="px-2 py-2 text-right clickable">{rowMenu(product)}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Celular: tarjetas (se edita en la pantalla del producto) */}
                        <ul className="space-y-2 md:hidden">
                            {products.map((p) => {
                                const mc = m2PerBox(p);
                                return (
                                    <li key={p.id} className="flex items-start gap-2 p-3 bg-white border border-ash rounded-card">
                                        <button type="button" onClick={() => open(p)} className="flex-1 min-w-0 text-left">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <div className="font-medium text-charcoal">
                                                        {p.brand} {p.model}
                                                    </div>
                                                    <div className="text-xs text-fog">
                                                        {[p.measure, mc ? `${qty(mc)} m²/caja` : p.mc, p.unit].filter(Boolean).join(" · ")}
                                                    </div>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    {Number(p.price ?? 0) > 0 ? (
                                                        <div className="font-semibold tabular-nums text-charcoal">{formatCurrency(p.price)}</div>
                                                    ) : (
                                                        <div className="text-sm font-medium text-amber-700">Sin precio</div>
                                                    )}
                                                    <div className="text-xs text-fog">Costo {formatCurrency(p.cost)}</div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 mt-2 text-xs text-steel">
                                                <span>Existencias: <b className="font-semibold">{stockDisplay(p)}</b></span>
                                                <span>Margen: {marginDisplay(p)}</span>
                                            </div>
                                        </button>
                                        {rowMenu(p)}
                                    </li>
                                );
                            })}
                        </ul>
                    </>
                )}

                <Pagination pagination={pagination} />
            </div>

            <BulkPriceDialog
                open={bulk !== null}
                onOpenChange={(o) => !o && setBulk(null)}
                ids={bulk === "selection" ? selectedItems : []}
                brand={bulk === "brand" ? brandQuery : null}
                count={bulk === "selection" ? selectedItems.length : !filters.query && !filters.estado ? summary.total : null}
                preview={bulk === "selection" ? selectedOnPage : products}
                onDone={() => setSelectedItems([])}
            />
        </Container>
    );
};

export default Index;
