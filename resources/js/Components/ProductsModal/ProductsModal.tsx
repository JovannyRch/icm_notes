import { formatCurrency } from "@/helpers/formatters";
import { Product } from "@/types/Product";
import * as Dialog from "@radix-ui/react-dialog";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import { useDebounce } from "use-debounce";

const MIN_SEARCH_LENGTH = 2;

interface ProductsModalProps {
    open: boolean;
    onClose: () => void;
    onAddProduct: (product: Product) => void;
    onReplaceProduct?: (products: Product) => void;
    mode?: "append" | "replace";
}

const fetchProducts = async (query: string) => {
    if (!query || query.length < MIN_SEARCH_LENGTH) return [];
    const { data } = await axios.get(`/api/products/search?query=${query}`);
    return data;
};

const ProductsModal = ({
    open,
    onClose,
    onAddProduct,
    onReplaceProduct,
    mode = "append",
}: ProductsModalProps) => {
    const [searchInput, setSearchInput] = useState("");
    const [debouncedSearch] = useDebounce(searchInput, 300);

    const { data: filteredProducts = [], isLoading } = useQuery({
        queryKey: ["products", debouncedSearch],
        queryFn: () => fetchProducts(debouncedSearch),
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
                <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
                <Dialog.Content className="fixed w-full max-w-[1000px] p-6 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-lg top-1/2 left-1/2">
                    <Dialog.Title className="mb-4 text-lg font-bold">
                        Buscar producto
                    </Dialog.Title>

                    <div className="max-w-md mx-auto my-4">
                        <label className="mb-2 text-sm font-medium text-gray-900 sr-only ">
                            Search
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 flex items-center pointer-events-none start-0 ps-3">
                                <svg
                                    className="w-4 h-4 text-gray-500 "
                                    aria-hidden="true"
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 20 20"
                                >
                                    <path
                                        stroke="currentColor"
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        stroke-width="2"
                                        d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z"
                                    />
                                </svg>
                            </div>
                            <input
                                type="search"
                                id="default-search"
                                className="block w-full p-2 text-sm text-gray-900 border border-gray-300 rounded-lg ps-10 bg-gray-50 focus:ring-blue-500 focus:border-blue-500 "
                                placeholder="Buscar producto..."
                                onChange={(e) => setSearchInput(e.target.value)}
                                value={searchInput}
                            />
                        </div>
                    </div>

                    <div className="min-h-[300px] max-h-[500px] overflow-y-auto">
                        <p className="text-center text-gray-500">
                            {isLoading
                                ? "Buscando productos..."
                                : debouncedSearch.length < MIN_SEARCH_LENGTH
                                ? `Ingresa al menos ${MIN_SEARCH_LENGTH} caracteres para buscar`
                                : filteredProducts.length === 0
                                ? "No se encontraron productos"
                                : ""}
                        </p>
                        {filteredProducts.length > 0 && (
                            <div className="relative overflow-x-auto shadow-md sm:rounded-lg">
                                <table className="w-full text-sm text-left text-gray-500 rtl:text-right ">
                                    <thead className="text-xs text-black uppercase bg-gray-50 ">
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
                                                m²
                                            </th>
                                            <th scope="col" className="p-3">
                                                Unidad
                                            </th>
                                            <th scope="col" className="p-3">
                                                Precio
                                            </th>
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
                                                    className="text-gray-900 border-b border-gray-200 hover:cursor-pointer odd:bg-white even:bg-gray-50 hover:bg-gray-100 "
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
                                                    <td className="p-3 font-semibold">
                                                        {formatCurrency(
                                                            product.price
                                                        )}
                                                    </td>
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
                            <button className="px-4 py-2 text-white bg-gray-500 rounded-md hover:bg-gray-600">
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
