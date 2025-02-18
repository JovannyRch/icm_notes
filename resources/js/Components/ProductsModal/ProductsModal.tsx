import { formatCurrency } from "@/helpers/formatters";
import { Product } from "@/types/Product";
import {
    Dialog,
    IconButton,
    Portal,
    Table,
    Text,
    TextField,
} from "@radix-ui/themes";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import { BiCheck, BiPlus, BiSend } from "react-icons/bi";
import { FaMagnifyingGlass } from "react-icons/fa6";
import { IoCloseCircle } from "react-icons/io5";

interface ProductsModalProps {
    open: boolean;
    onClose: () => void;
    onAddProduct: (product: Product) => void;
    onReplaceProduct?: (products: Product) => void;
    mode?: "append" | "replace";
}

const ProductsModal = ({
    open,
    onClose,
    onAddProduct,
    onReplaceProduct,
    mode = "append",
}: ProductsModalProps) => {
    const { data: products } = useQuery<Product[]>({
        queryKey: ["todos"],
        queryFn: async () => {
            const { data } = await axios.get("/api/products");
            return data;
        },
    });

    const [searchInput, setSearchInput] = useState("");

    const filteredProducts = useMemo(() => {
        if (!searchInput) {
            return products;
        }

        return products?.filter((product) =>
            [
                product.code,
                product.type,
                product.brand,
                product.model,
                product.measure,
                product.description,
            ].some((field) =>
                field?.toLowerCase().includes(searchInput.toLowerCase())
            )
        );
    }, [searchInput, products]);

    useEffect(() => {
        if (!open) {
            setSearchInput("");
        }
    }, [open]);

    return (
        <Dialog.Root open={open}>
            <Portal>
                <Dialog.Content
                    style={{ margin: 0 }}
                    className="fixed left-1/2 top-1/5 max-h-[85vh] w-[90vw] max-w-[800px] m-0 -translate-x-1/2 -translate-y-1/5 rounded-md bg-gray1 p-[25px] shadow-[var(--shadow-6)] focus:outline-none data-[state=open]:animate-contentShow"
                >
                    <Dialog.Title className="m-0 text-[17px] font-medium text-mauve12">
                        Buscar producto
                    </Dialog.Title>
                    <Dialog.Description className="mb-5 mt-2.5 text-[15px] leading-normal text-mauve11">
                        <TextField.Root
                            placeholder="Buscar producto"
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                        >
                            <TextField.Slot>
                                <FaMagnifyingGlass height="16" width="16" />
                            </TextField.Slot>
                        </TextField.Root>
                    </Dialog.Description>

                    <div className="min-h-[250px] overflow-y-auto">
                        {filteredProducts?.length ? (
                            <>
                                {" "}
                                <Table.Root>
                                    <Table.Header>
                                        <Table.Row>
                                            <Table.ColumnHeaderCell>
                                                <Text size="1">Producto</Text>
                                            </Table.ColumnHeaderCell>
                                            <Table.ColumnHeaderCell>
                                                <Text size="1">Tipo</Text>
                                            </Table.ColumnHeaderCell>
                                            <Table.ColumnHeaderCell>
                                                <Text size="1">Marca</Text>
                                            </Table.ColumnHeaderCell>
                                            <Table.ColumnHeaderCell>
                                                <Text size="1">Medida</Text>
                                            </Table.ColumnHeaderCell>
                                            <Table.ColumnHeaderCell>
                                                <Text size="1">
                                                    {" "}
                                                    Caja/Bulto
                                                </Text>
                                            </Table.ColumnHeaderCell>
                                            <Table.ColumnHeaderCell>
                                                <Text size="1">Costo</Text>
                                            </Table.ColumnHeaderCell>

                                            <Table.ColumnHeaderCell></Table.ColumnHeaderCell>
                                        </Table.Row>
                                    </Table.Header>

                                    <Table.Body>
                                        {filteredProducts?.map((product) => (
                                            <Table.Row key={product.id}>
                                                <Table.Cell>
                                                    <Text size="1">
                                                        {[
                                                            product.code,
                                                            product.model,
                                                        ]
                                                            .filter(Boolean)
                                                            .join("-")}
                                                    </Text>
                                                </Table.Cell>
                                                <Table.Cell>
                                                    <Text size="1">
                                                        {product.type ?? "-"}
                                                    </Text>
                                                </Table.Cell>
                                                <Table.Cell>
                                                    <Text size="1">
                                                        {product.brand ?? "-"}
                                                    </Text>
                                                </Table.Cell>
                                                <Table.Cell>
                                                    <Text size="1">
                                                        {product.measure ?? "-"}
                                                    </Text>
                                                </Table.Cell>
                                                <Table.Cell>
                                                    <Text size="1">
                                                        {product.caja_bulto ??
                                                            "-"}
                                                    </Text>
                                                </Table.Cell>
                                                <Table.Cell>
                                                    <Text size="1">
                                                        {formatCurrency(
                                                            product.cost
                                                        ) ?? "-"}
                                                    </Text>
                                                </Table.Cell>

                                                <Table.Cell>
                                                    <IconButton
                                                        color="green"
                                                        onClick={() => {
                                                            if (
                                                                mode ===
                                                                "append"
                                                            ) {
                                                                onAddProduct(
                                                                    product
                                                                );
                                                            } else {
                                                                onReplaceProduct?.(
                                                                    product
                                                                );
                                                                onClose();
                                                            }
                                                        }}
                                                    >
                                                        {mode === "append" ? (
                                                            <BiPlus />
                                                        ) : (
                                                            <BiSend />
                                                        )}
                                                    </IconButton>
                                                </Table.Cell>
                                            </Table.Row>
                                        ))}
                                    </Table.Body>
                                </Table.Root>
                            </>
                        ) : (
                            <div className="text-center text-gray-500 flex items-center justify-center h-[250px]">
                                No se encontraron productos
                            </div>
                        )}
                    </div>

                    <Dialog.Close>
                        <button
                            className="absolute right-2.5 top-2.5 inline-flex size-[25px] appearance-none items-center justify-center rounded-full text-violet11 bg-gray3 hover:bg-violet4 focus:shadow-[0_0_0_2px] focus:shadow-violet7 focus:outline-none"
                            aria-label="Close"
                            onClick={onClose}
                        >
                            <IoCloseCircle />
                        </button>
                    </Dialog.Close>
                </Dialog.Content>
            </Portal>
        </Dialog.Root>
    );
};

export default ProductsModal;
