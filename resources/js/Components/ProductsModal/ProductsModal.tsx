import { formatCurrency } from "@/helpers/formatters";
import { Product } from "@/types/Product";
import * as Dialog from "@radix-ui/react-dialog";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import { useDebounce } from "use-debounce";
import SearchInput from "../SearchInput";

const MIN_SEARCH_LENGTH = 2;

interface ProductsModalProps {
    open: boolean;
    onClose: () => void;
    onAddProduct: (product: Product) => void;
    onReplaceProduct?: (products: Product) => void;
    mode?: "append" | "replace";
    /** Sucursal cuyas existencias se muestran (la de la nota). */
    branchId?: number;
}

const fetchProducts = async (query: string, branchId?: number) => {
    if (!query || query.length < MIN_SEARCH_LENGTH) return [];
    // La API no tiene sesión: la sucursal se manda explícita para que las
    // existencias (branch_stock) sean las de la nota y no las de la primera sucursal.
    const { data } = await axios.get("/api/products/search", {
        params: { query, ...(branchId ? { branch_id: branchId } : {}) },
    });
    return data;
};

/**
 * Existencias para vender: rojo sin existencias, ámbar pocas (≤ 3). Si el producto
 * nunca se ha contado en la sucursal, "sin inventario" en gris (no es lo mismo que 0).
 */
const StockCell = ({ value, countedAt }: { value: Product["branch_stock"]; countedAt: Product["branch_counted_at"] }) => {
    if (!countedAt) {
        return (
            <span className="text-xs text-fog" title="Aún no se han cargado existencias de este producto en esta sucursal">
                sin inventario
            </span>
        );
    }
    const qty = value === null || value === undefined ? 0 : Number(value);
    const tone = qty <= 0 ? "text-red-600" : qty <= 3 ? "text-amber-700" : "text-charcoal";
    return (
        <span className={`font-semibold tabular-nums ${tone}`} title={qty <= 0 ? "Sin existencias en esta sucursal" : undefined}>
            {Number.isInteger(qty) ? qty : qty.toFixed(2)}
            {qty <= 0 && <span className="ml-1 text-xs font-normal">sin existencias</span>}
        </span>
    );
};

const ProductsModal = ({
    open,
    onClose,
    onAddProduct,
    onReplaceProduct,
    mode = "append",
    branchId,
}: ProductsModalProps) => {
    const [searchInput, setSearchInput] = useState("");
    const [debouncedSearch] = useDebounce(searchInput, 300);

    const { data: filteredProducts = [], isLoading } = useQuery({
        queryKey: ["products", debouncedSearch, branchId],
        queryFn: () => fetchProducts(debouncedSearch, branchId),
        enabled: debouncedSearch.length >= MIN_SEARCH_LENGTH,
    });

    useEffect(() => {
        if (!open) {
            setSearchInput("");
        }
    }, [open]);

    return (
        <Dialog.Root open={open} onOpenChange={onClose}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/40" />
                <Dialog.Content className="fixed z-50 w-[min(94vw,1000px)] p-6 -translate-x-1/2 -translate-y-1/2 bg-white border top-1/2 left-1/2 rounded-card-lg border-ash shadow-popover">
                    <Dialog.Title className="mb-4 text-lg font-bold">
                        Buscar producto
                    </Dialog.Title>

                    <SearchInput
                        value={searchInput}
                        onChange={setSearchInput}
                        placeholder="Buscar producto..."
                        className="max-w-md mx-auto my-4"
                    />

                    <div className="min-h-[300px] max-h-[500px] overflow-y-auto">
                        <p className="py-6 text-sm text-center text-fog">
                            {isLoading
                                ? "Buscando productos..."
                                : debouncedSearch.length < MIN_SEARCH_LENGTH
                                ? `Ingresa al menos ${MIN_SEARCH_LENGTH} caracteres para buscar`
                                : filteredProducts.length === 0
                                ? "No se encontraron productos"
                                : ""}
                        </p>
                        {filteredProducts.length > 0 && (
                            <div className="relative overflow-x-auto border rounded-card border-ash">
                                <table className="w-full text-sm text-left text-steel">
                                    <thead className="text-xs font-medium uppercase border-b text-fog border-ash">
                                        <tr>
                                            <th scope="col" className="p-3">
                                                Modelo
                                            </th>
                                            <th scope="col" className="p-3">
                                                Marca
                                            </th>

                                            <th scope="col" className="p-3">
                                                Medida
                                            </th>
                                            <th scope="col" className="p-3">
                                                MC
                                            </th>
                                            <th scope="col" className="p-3">
                                                Unidad
                                            </th>
                                            <th scope="col" className="p-3 text-right">
                                                Precio
                                            </th>
                                            {branchId && (
                                                <th scope="col" className="p-3 text-right">
                                                    Existencias
                                                </th>
                                            )}
                                            {/*      <th scope="col" className="p-3">
                                                Costo
                                            </th>

                                            <th scope="col" className="p-3">
                                                Extra
                                            </th> */}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredProducts.map(
                                            (product: Product) => (
                                                <tr
                                                    onClick={() => {
                                                        if (mode === "append") {
                                                            onAddProduct(
                                                                product
                                                            );
                                                        } else {
                                                            onReplaceProduct?.(
                                                                product
                                                            );
                                                        }
                                                        onClose();
                                                    }}
                                                    className="border-b cursor-pointer text-charcoal border-ash hover:bg-sky-tint/50"
                                                >
                                                    <td className="p-3">
                                                        {product.model}
                                                    </td>
                                                    <td className="p-3">
                                                        {product.brand}
                                                    </td>

                                                    <td className="p-3">
                                                        {product.measure}
                                                    </td>
                                                    <td className="p-3">
                                                        {product.mc}
                                                    </td>
                                                    <td className="p-3">
                                                        {product.unit}
                                                    </td>
                                                    <td className="p-3 font-semibold text-right tabular-nums">
                                                        {formatCurrency(
                                                            product.price
                                                        )}
                                                    </td>
                                                    {branchId && (
                                                        <td className="p-3 text-right">
                                                            <StockCell value={product.branch_stock} countedAt={product.branch_counted_at} />
                                                        </td>
                                                    )}
                                                    {/*    <td className="p-3">
                                                        {formatCurrency(
                                                            product.cost
                                                        )}
                                                    </td>

                                                    <td className="p-3">
                                                        {product.extra}%
                                                    </td> */}
                                                </tr>
                                            )
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end mt-4">
                        <Dialog.Close asChild>
                            <button className="inline-flex items-center h-9 px-4 text-sm font-medium bg-white border rounded-button border-ash text-charcoal hover:bg-paper">
                                Cerrar
                            </button>
                        </Dialog.Close>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
};

export default ProductsModal;
