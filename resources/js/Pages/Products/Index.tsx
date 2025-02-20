import Checkbox from "@/Components/Checkbox";
import Container from "@/Components/Container";
import Pagination from "@/Components/Pagination";
import useAlerts from "@/hooks/useAlerts";
import { PageProps } from "@/types";
import { Product } from "@/types/Product";
import { router, useForm } from "@inertiajs/react";
import { Button, Flex, Table, Text } from "@radix-ui/themes";
import { useState } from "react";
import { CgAdd } from "react-icons/cg";
import { FaFileExcel, FaListCheck } from "react-icons/fa6";
import { GiCancel } from "react-icons/gi";
import { TbTrash } from "react-icons/tb";
import ImportProducts from "./ImportProducts";
import { Inertia } from "@inertiajs/inertia";
import { formatCurrency } from "@/helpers/formatters";

interface Props extends PageProps {
    pagination: any;
}

const Index = ({ pagination, flash }: Props) => {
    const { data: products } = pagination;

    const [selectedItems, setSelectedItems] = useState<number[]>([]);

    useAlerts(flash);

    const handleDelete = () => {
        if (
            confirm(
                "¿Estás seguro de que deseas eliminar los productos seleccionados?"
            )
        ) {
            Inertia.post(
                route("products.destroy.items", { ids: selectedItems })
            );
        }
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
                    <Flex gap="2">
                        <Button
                            type="button"
                            color="gold"
                            className="btn btn-secondary hover:cursor-pointer"
                            onClick={() => {
                                setSelectedItems(
                                    products.map((p: Product) => p.id!)
                                );
                            }}
                            disabled={selectedItems.length === products.length}
                        >
                            Seleccionar todo
                            <FaListCheck />
                        </Button>
                        <Button
                            type="button"
                            color="gold"
                            className="btn btn-secondary hover:cursor-pointer"
                            onClick={() => {
                                setSelectedItems([]);
                            }}
                            disabled={selectedItems.length === 0}
                        >
                            Deshacer selección
                            <GiCancel />
                        </Button>

                        <Button
                            type="button"
                            color="red"
                            className="btn btn-secondary hover:cursor-pointer"
                            onClick={handleDelete}
                            disabled={selectedItems.length === 0}
                        >
                            Eliminar
                            <TbTrash />
                        </Button>
                        <ImportProducts />
                    </Flex>
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
                </Flex>

                <Table.Root>
                    <Table.Header>
                        <Table.Row>
                            <Table.ColumnHeaderCell></Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell>Id</Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell>
                                Marca
                            </Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell>
                                Código
                            </Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell>
                                Modelo
                            </Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell className="text-center">
                                Tipo
                            </Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell className="text-center">
                                Medida
                            </Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell className="text-center">
                                MC
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
                                            onClick={() => {
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
                                <Table.Cell>{product.code}</Table.Cell>
                                <Table.Cell>{product.model}</Table.Cell>
                                <Table.Cell className="text-center">
                                    {product.type}
                                </Table.Cell>
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
