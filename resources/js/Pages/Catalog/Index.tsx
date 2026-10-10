import Container from "@/Components/Container";
import Pagination from "@/Components/Pagination";
import PageHeader from "@/Components/ui/PageHeader";
import { formatCurrency } from "@/helpers/formatters";
import { PageProps } from "@/types";
import { router } from "@inertiajs/react";
import { Button, Select, Switch, Text } from "@radix-ui/themes";
import { useEffect, useRef, useState } from "react";
import { LuPackageSearch, LuSearch, LuShoppingCart, LuX } from "react-icons/lu";

interface CatalogProduct {
    id: number;
    brand: string;
    model: string;
    measure: string | null;
    mc: string | null;
    unit: string | null;
    price: number;
    /** Precio 2 (mayoreo); null = no tiene. */
    price2: number | null;
    m2_per_box: number | null;
    price_per_m2: number | null;
    stock: number | null; // null = sin inventario (nunca contado ni vendido) o sin permiso
    counted: boolean;
}

interface Filters {
    q: string;
    brand: string | null;
    in_stock: boolean;
    sort: "marca" | "precio_asc" | "precio_desc" | "existencias";
}

interface Props extends PageProps {
    pagination: { data: CatalogProduct[]; total: number } & any;
    brands: string[];
    filters: Filters;
    seeStock: boolean;
    canSell: boolean;
    branch: { id: number; name: string } | null;
}

const ALL = "__all__";
const sortLabels: Record<Filters["sort"], string> = {
    marca: "Marca y modelo",
    precio_asc: "Precio: menor a mayor",
    precio_desc: "Precio: mayor a menor",
    existencias: "Más existencias",
};

const qty = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2));

/** Existencias como píldora: verde hay, ámbar pocas (≤ 3), rojo agotado o negativo, gris sin inventario. */
const StockPill = ({ p }: { p: CatalogProduct }) => {
    if (p.stock === null) {
        return (
            <span className="text-xs text-fog" title="Aún no se han cargado existencias de este producto en la sucursal">
                sin inventario
            </span>
        );
    }
    const tone =
        p.stock <= 0 ? "bg-rose-tint text-red-800" : p.stock <= 3 ? "bg-amber-tint text-amber-900" : "bg-mint text-green-900";
    return (
        <span
            className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-tag tabular-nums ${tone}`}
            title={!p.counted ? "Vendido sin existencias cargadas: se descuenta desde 0" : undefined}
        >
            {p.stock <= 0 ? `${qty(p.stock)} · agotado` : `${qty(p.stock)} ${p.unit?.toLowerCase() === "caja" ? (p.stock === 1 ? "caja" : "cajas") : "disp."}`}
        </span>
    );
};

const CatalogIndex = ({ pagination, brands, filters, seeStock, canSell, branch }: Props) => {
    const products: CatalogProduct[] = pagination.data;
    const [query, setQuery] = useState(filters.q);
    const searchRef = useRef<HTMLInputElement>(null);
    const firstRender = useRef(true);

    // Navega con los filtros actuales (en la URL: se pueden compartir y sobreviven a recargar).
    const apply = (changes: Partial<Filters>) => {
        const next = { ...filters, q: query, ...changes };
        router.get(
            route("catalog"),
            {
                ...(next.q ? { q: next.q } : {}),
                ...(next.brand ? { brand: next.brand } : {}),
                ...(next.in_stock ? { con_existencias: 1 } : {}),
                ...(next.sort !== "marca" ? { sort: next.sort } : {}),
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
        const t = setTimeout(() => apply({ q: query }), 250);
        return () => clearTimeout(t);
    }, [query]);

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

    const sell = (p: CatalogProduct) => router.visit(route("caja", { agregar: p.id }));
    const hasFilters = !!(filters.q || filters.brand || filters.in_stock);

    return (
        <Container headTitle="Productos">
            <PageHeader
                eyebrow={branch?.name}
                title="Productos"
                description={`${pagination.total} ${pagination.total === 1 ? "producto" : "productos"}${seeStock ? ` · existencias de ${branch?.name ?? "la sucursal"}` : ""}`}
            />

            <div className="flex flex-wrap items-center gap-2 mb-4">
                <div className="relative w-full sm:w-[360px]">
                    <LuSearch className="absolute w-4 h-4 -translate-y-1/2 pointer-events-none left-3 top-1/2 text-fog" aria-hidden />
                    <input
                        ref={searchRef}
                        type="search"
                        aria-label="Buscar productos"
                        placeholder="Marca, modelo, medida o m²…"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={(e) => e.key === "Escape" && setQuery("")}
                        className="w-full h-10 pl-9 pr-10 text-sm bg-white border rounded-input border-pebble text-charcoal placeholder:text-fog focus:border-electric focus:ring-2 focus:ring-electric/20"
                    />
                    <kbd className="absolute hidden px-1.5 text-[11px] -translate-y-1/2 border sm:block right-2.5 top-1/2 rounded border-ash text-fog bg-paper">/</kbd>
                </div>

                <Select.Root value={filters.brand ?? ALL} onValueChange={(v) => apply({ brand: v === ALL ? null : v })}>
                    <Select.Trigger aria-label="Marca" variant="surface" placeholder="Marca" />
                    <Select.Content position="popper">
                        <Select.Item value={ALL}>Todas las marcas</Select.Item>
                        {brands.map((b) => (
                            <Select.Item key={b} value={b}>
                                {b}
                            </Select.Item>
                        ))}
                    </Select.Content>
                </Select.Root>

                <Select.Root value={filters.sort} onValueChange={(v) => apply({ sort: v as Filters["sort"] })}>
                    <Select.Trigger aria-label="Ordenar" variant="surface" />
                    <Select.Content position="popper">
                        {(Object.keys(sortLabels) as Filters["sort"][])
                            .filter((k) => seeStock || k !== "existencias")
                            .map((k) => (
                                <Select.Item key={k} value={k}>
                                    {sortLabels[k]}
                                </Select.Item>
                            ))}
                    </Select.Content>
                </Select.Root>

                {seeStock && (
                    <Text as="label" size="2" className="inline-flex items-center gap-2 px-1 text-steel">
                        <Switch size="1" checked={filters.in_stock} onCheckedChange={(v) => apply({ in_stock: v })} />
                        Solo con existencias
                    </Text>
                )}

                {hasFilters && (
                    <button
                        type="button"
                        onClick={() => {
                            setQuery("");
                            router.get(route("catalog"), filters.sort !== "marca" ? { sort: filters.sort } : {}, { preserveState: true, replace: true });
                        }}
                        className="inline-flex items-center gap-1 h-8 px-2 text-sm rounded-button text-fog hover:text-charcoal"
                    >
                        <LuX className="w-4 h-4" aria-hidden /> Quitar filtros
                    </button>
                )}
            </div>

            {products.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center border border-ash rounded-card">
                    <LuPackageSearch className="w-8 h-8 mb-3 text-fog" aria-hidden />
                    <p className="font-medium text-charcoal">No hay productos con esos filtros</p>
                    <p className="mt-1 text-sm text-fog">Prueba con otra palabra, otra marca o quita "Solo con existencias".</p>
                </div>
            ) : (
                <>
                    {/* Escritorio: tabla */}
                    <div className="hidden overflow-hidden border md:block border-ash rounded-card">
                        <table className="w-full text-sm">
                            <thead className="text-xs text-left border-b text-fog border-ash bg-paper">
                                <tr>
                                    <th className="px-4 py-2.5 font-medium">Producto</th>
                                    <th className="px-4 py-2.5 font-medium">Presentación</th>
                                    <th className="px-4 py-2.5 font-medium text-right">Precio</th>
                                    {seeStock && <th className="px-4 py-2.5 font-medium text-right">Existencias</th>}
                                    {canSell && <th className="px-4 py-2.5" />}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-ash">
                                {products.map((p) => (
                                    <tr key={p.id} className="hover:bg-paper/60">
                                        <td className="px-4 py-3">
                                            <div className="font-medium text-charcoal">
                                                {p.brand} {p.model}
                                            </div>
                                            {p.measure && <div className="text-xs text-fog">{p.measure}</div>}
                                        </td>
                                        <td className="px-4 py-3 text-steel">
                                            {p.m2_per_box ? <span className="tabular-nums">{qty(p.m2_per_box)} m²/caja</span> : null}
                                            {p.m2_per_box && p.unit ? " · " : null}
                                            {p.unit}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            {p.price > 0 ? (
                                            <div className="font-semibold tabular-nums text-charcoal">{formatCurrency(p.price)}</div>
                                        ) : (
                                            <div className="text-sm font-medium text-amber-700">Sin precio</div>
                                        )}
                                            {p.price2 !== null && <div className="text-xs tabular-nums text-steel">P2 {formatCurrency(p.price2)}</div>}
                                            {p.price_per_m2 !== null && (
                                                <div className="text-xs tabular-nums text-fog">{formatCurrency(p.price_per_m2)} / m²</div>
                                            )}
                                        </td>
                                        {seeStock && (
                                            <td className="px-4 py-3 text-right">
                                                <StockPill p={p} />
                                            </td>
                                        )}
                                        {canSell && (
                                            <td className="px-4 py-3 text-right">
                                                <Button size="1" variant="soft" onClick={() => sell(p)} aria-label={`Vender ${p.brand} ${p.model}`}>
                                                    <LuShoppingCart /> Vender
                                                </Button>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Celular: tarjetas */}
                    <ul className="space-y-2 md:hidden">
                        {products.map((p) => (
                            <li key={p.id} className="p-3 bg-white border border-ash rounded-card">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="font-medium text-charcoal">
                                            {p.brand} {p.model}
                                        </div>
                                        <div className="text-xs text-fog">
                                            {[p.measure, p.m2_per_box ? `${qty(p.m2_per_box)} m²/caja` : null, p.unit].filter(Boolean).join(" · ")}
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                        {p.price > 0 ? (
                                            <div className="font-semibold tabular-nums text-charcoal">{formatCurrency(p.price)}</div>
                                        ) : (
                                            <div className="text-sm font-medium text-amber-700">Sin precio</div>
                                        )}
                                        {p.price2 !== null && <div className="text-xs tabular-nums text-steel">P2 {formatCurrency(p.price2)}</div>}
                                        {p.price_per_m2 !== null && <div className="text-xs tabular-nums text-fog">{formatCurrency(p.price_per_m2)} / m²</div>}
                                    </div>
                                </div>
                                {(seeStock || canSell) && (
                                    <div className="flex items-center justify-between mt-2">
                                        {seeStock ? <StockPill p={p} /> : <span />}
                                        {canSell && (
                                            <Button size="1" variant="soft" onClick={() => sell(p)} aria-label={`Vender ${p.brand} ${p.model}`}>
                                                <LuShoppingCart /> Vender
                                            </Button>
                                        )}
                                    </div>
                                )}
                            </li>
                        ))}
                    </ul>

                    <Pagination pagination={pagination} />
                </>
            )}
        </Container>
    );
};

export default CatalogIndex;
