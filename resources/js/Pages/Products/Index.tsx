import Checkbox from "@/Components/Checkbox";
import Container from "@/Components/Container";
import Pagination from "@/Components/Pagination";
import useAlerts from "@/hooks/useAlerts";
import { PageProps } from "@/types";
import { Product } from "@/types/Product";
import { router } from "@inertiajs/react";
import {
    Button,
    DropdownMenu,
    Flex,
    Grid,
    Table,
    Text,
} from "@radix-ui/themes";
import { useState } from "react";
import { CgAdd } from "react-icons/cg";
import { FaFileExcel, FaListCheck } from "react-icons/fa6";
import { GiCancel } from "react-icons/gi";
import { TbTrash } from "react-icons/tb";
import ImportProducts from "./ImportProducts";
import { Inertia } from "@inertiajs/inertia";
import { formatCurrency } from "@/helpers/formatters";
import { confirmAlert } from "react-confirm-alert";
import { MdDeleteSweep } from "react-icons/md";
import { BiDownload } from "react-icons/bi";
import SearchInput from "@/Components/SearchInput";
import ProductsSearchInput from "./components/ProductsSearchInput";
import DateFilter from "../Notes/components/DateFilter";

interface Props extends PageProps {
    pagination: any;
}

const Index = ({ pagination, flash }: Props) => {
    const { data: products } = pagination;

    const [selectedItems, setSelectedItems] = useState<number[]>([]);

    useAlerts(flash);

    const handleDelete = () => {
        confirmAlert({
            title:
                selectedItems.length > 1
                    ? "Eliminar productos"
                    : "Eliminar producto",
            message:
                selectedItems.length > 1
                    ? "¿Estás seguro de que deseas eliminar los productos seleccionados? Esta acción no se puede deshacer."
                    : "¿Estás seguro de que deseas eliminar el producto seleccionado? Esta acción no se puede deshacer.",
            buttons: [
                {
                    label: "Sí",
                    onClick: () => {
                        Inertia.post(
                            route("products.destroy.items", {
                                ids: selectedItems,
                            })
                        );
                    },
                },
                {
                    label: "No",
                    onClick: () => {},
                },
            ],
        });
    };

    const handleDeleteAll = () => {
        confirmAlert({
            title: "Eliminar todos los productos",
            message:
                "¿Estás seguro de que deseas eliminar todos los productos? Esta acción no se puede deshacer.",
            buttons: [
                {
                    label: "Sí",
                    onClick: () => {
                        Inertia.post(route("products.destroy.all"));
                    },
                },
                {
                    label: "No",
                    onClick: () => {},
                },
            ],
        });
    };

    const handleExport = () => {
        Inertia.get(route("export.products"));
    };

    return (
        <Container headTitle="Productos">
            <div style={{ minHeight: "calc(100vh - 130px)" }}>
                <div>
                    <Text size="6" className="font-semibold">
                        Productos
                    </Text>
                </div>
                <Flex justify="between" gap="4" className="my-4">
                    <div>
                        <Button
                            onClick={() => {
                                router.visit(route("products.create"));
                            }}
                            className="hover:cursor-pointer"
                        >
                            Registrar Producto
                            <CgAdd className="w-5 h-5" />
                        </Button>
                    </div>
                    <Flex gap="2" align="center">
                        <ImportProducts />
                        <Button
                            color="teal"
                            className="hover:cursor-pointer"
                            onClick={handleExport}
                        >
                            Exportar
                            <BiDownload />
                        </Button>

                        <span className="text-gray-400">|</span>
                        <Button
                            type="button"
                            variant="soft"
                            color="red"
                            className="btn btn-secondary hover:cursor-pointer"
                            onClick={handleDelete}
                            disabled={selectedItems.length === 0}
                        >
                            Eliminar selección
                            <TbTrash />
                        </Button>
                        <Button
                            type="button"
                            color="red"
                            className="btn btn-secondary hover:cursor-pointer"
                            onClick={handleDeleteAll}
                        >
                            Eliminar todo
                            <MdDeleteSweep />
                        </Button>
                    </Flex>
                </Flex>

                <Grid gap="5" columns="8" className="mb-4">
                    <Grid
                        gridColumn={{
                            lg: "span 3",
                            md: "span 4",
                            xs: "span 8",
                        }}
                    >
                        <ProductsSearchInput />
                    </Grid>
                </Grid>

                <Table.Root>
                    <Table.Header>
                        <Table.Row>
                            <Table.ColumnHeaderCell>
                                <div className="flex items-center justify-center w-full h-full checkbox clickable">
                                    <Checkbox
                                        disabled={products.length === 0}
                                        checked={
                                            products.length > 0 &&
                                            selectedItems.length ===
                                                products.length
                                        }
                                        onChange={() => {
                                            if (selectedItems.length > 0) {
                                                setSelectedItems([]);
                                            } else {
                                                setSelectedItems(
                                                    products.map(
                                                        (product: Product) =>
                                                            product.id!
                                                    )
                                                );
                                            }
                                        }}
                                    />
                                </div>
                            </Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell>Id</Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell>
                                Marca
                            </Table.ColumnHeaderCell>

                            <Table.ColumnHeaderCell>
                                Modelo
                            </Table.ColumnHeaderCell>

                            <Table.ColumnHeaderCell className="text-center">
                                Medida
                            </Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell className="text-center">
                                m²
                            </Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell className="text-center">
                                Unidad
                            </Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell className="text-center">
                                Precio
                            </Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell className="text-center">
                                Costo
                            </Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell className="text-center">
                                IVA
                            </Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell className="text-center">
                                Extra
                            </Table.ColumnHeaderCell>
                        </Table.Row>
                    </Table.Header>

                    <Table.Body>
                        {(products as Product[]).map((product) => (
                            <Table.Row
                                key={product.id}
                                onClick={(e: any) => {
                                    if (
                                        !e.target.classList.contains(
                                            "clickable"
                                        )
                                    ) {
                                        router.visit(
                                            route("products.show", product.id)
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
                                                product.id!
                                            )}
                                            onChange={() => {
                                                if (
                                                    selectedItems.includes(
                                                        product.id!
                                                    )
                                                ) {
                                                    setSelectedItems(
                                                        selectedItems.filter(
                                                            (id) =>
                                                                id !==
                                                                product.id
                                                        )
                                                    );
                                                } else {
                                                    setSelectedItems([
                                                        ...selectedItems,
                                                        product.id!,
                                                    ]);
                                                }
                                            }}
                                        />
                                    </div>
                                </Table.Cell>
                                <Table.Cell>{product.id}</Table.Cell>
                                <Table.Cell>{product.brand}</Table.Cell>
                                <Table.Cell>{product.model}</Table.Cell>
                                <Table.Cell className="text-center">
                                    {product.measure}
                                </Table.Cell>
                                <Table.Cell className="text-center">
                                    {product.mc}
                                </Table.Cell>
                                <Table.Cell className="text-center">
                                    {product.unit}
                                </Table.Cell>
                                <Table.Cell className="text-center">
                                    {formatCurrency(product.price)}
                                </Table.Cell>
                                <Table.Cell className="text-center">
                                    {formatCurrency(product.cost)}
                                </Table.Cell>

                                <Table.Cell className="text-center">
                                    {product.iva}%
                                </Table.Cell>
                                <Table.Cell className="text-center">
                                    {product.extra ?? 0}%
                                </Table.Cell>
                            </Table.Row>
                        ))}
                    </Table.Body>
                </Table.Root>

                {products.length === 0 && (
                    <div className="flex items-center justify-center w-full h-full min-h-[52vh]">
                        <Text size="6">No se econtraron productos</Text>
                    </div>
                )}

                <Pagination pagination={pagination} />
            </div>
        </Container>
    );
};

export default Index;
