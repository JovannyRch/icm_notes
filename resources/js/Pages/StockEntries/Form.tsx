import Container from "@/Components/Container";
import ContainerSection from "@/Components/ContainerSection";
import PageHeader from "@/Components/ui/PageHeader";
import InputWithLabel from "@/Components/InputWithLabel";
import ProductsModal from "@/Components/ProductsModal/ProductsModal";
import { getToday } from "@/helpers/formatters";
import useAlerts from "@/hooks/useAlerts";
import { useBranch } from "@/hooks/useBranch";
import { PageProps } from "@/types";
import { Product } from "@/types/Product";
import { router, useForm } from "@inertiajs/react";
import { Button, Flex, Table, Text } from "@radix-ui/themes";
import { useState } from "react";
import { BiArrowBack, BiPlus, BiSave } from "react-icons/bi";
import { TbTrash } from "react-icons/tb";
import { toast } from "react-toastify";

interface EntryRow {
    product: Product;
    quantity: string;
}

const StockEntryForm = ({ flash }: PageProps) => {
    useAlerts(flash);
    const { currentBranchName } = useBranch();

    const [rows, setRows] = useState<EntryRow[]>([]);
    const [showProductsModal, setShowProductsModal] = useState(false);

    const { data, setData, post, processing, errors, transform, reset } =
        useForm({
            date: getToday(),
            reference: "",
            items: [] as { product_id: number; quantity: string }[],
        });

    const addProduct = (product: Product) => {
        if (rows.some((row) => row.product.id === product.id)) {
            toast.warning("Ese producto ya está en la nota");
            return;
        }
        setRows([...rows, { product, quantity: "1" }]);
    };

    const updateQuantity = (index: number, quantity: string) => {
        setRows(rows.map((row, i) => (i === index ? { ...row, quantity } : row)));
    };

    const removeRow = (index: number) => {
        setRows(rows.filter((_, i) => i !== index));
    };

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        transform((data) => ({
            ...data,
            items: rows.map((row) => ({
                product_id: row.product.id,
                quantity: row.quantity,
            })),
        }));
        post(route("stock-entries.store"), {
            onSuccess: () => {
                setRows([]);
                reset("reference");
            },
        });
    };

    const itemError = (index: number) =>
        (errors as Record<string, string>)[`items.${index}.quantity`] ??
        (errors as Record<string, string>)[`items.${index}.product_id`];

    return (
        <Container headTitle="Nota de entrada">
            <form onSubmit={handleSubmit}>
                <PageHeader
                    back={{ label: "Notas", href: route("notas") }}
                    eyebrow={currentBranchName}
                    title="Nota de entrada"
                    description="Registra productos comprados del catálogo; se suman al stock de esta sucursal."
                    actions={
                        <Button type="submit" disabled={processing || rows.length === 0}>
                            <BiSave />
                            {processing ? "Guardando..." : "Guardar entrada"}
                        </Button>
                    }
                />

                <ContainerSection
                    title="Datos de la entrada"
                    className="grid grid-cols-1 gap-4 md:grid-cols-2"
                >
                    <InputWithLabel
                        label="Fecha"
                        name="date"
                        type="date"
                        value={data.date}
                        onChange={(e) => setData("date", e.target.value)}
                        error={errors.date}
                    />
                    <InputWithLabel
                        label="Referencia (proveedor, factura...)"
                        name="reference"
                        value={data.reference}
                        onChange={(e) => setData("reference", e.target.value)}
                        error={errors.reference}
                    />
                </ContainerSection>

                <ContainerSection title="Productos">
                    <Flex justify="end" className="mb-3">
                        <Button
                            type="button"
                            variant="outline"
                            color="gray"
                            onClick={() => setShowProductsModal(true)}
                        >
                            Agregar producto
                            <BiPlus />
                        </Button>
                    </Flex>

                    {errors.items && (
                        <p className="mb-2 text-sm text-red-600">
                            {errors.items}
                        </p>
                    )}

                    {rows.length === 0 ? (
                        <p className="py-8 text-center text-fog">
                            Agrega los productos del catálogo que se compraron.
                        </p>
                    ) : (
                        <Table.Root>
                            <Table.Header>
                                <Table.Row>
                                    <Table.ColumnHeaderCell>
                                        Marca
                                    </Table.ColumnHeaderCell>
                                    <Table.ColumnHeaderCell>
                                        Modelo
                                    </Table.ColumnHeaderCell>
                                    <Table.ColumnHeaderCell>
                                        Medida
                                    </Table.ColumnHeaderCell>
                                    <Table.ColumnHeaderCell>
                                        Unidad
                                    </Table.ColumnHeaderCell>
                                    <Table.ColumnHeaderCell width="160px">
                                        Cantidad
                                    </Table.ColumnHeaderCell>
                                    <Table.ColumnHeaderCell width="60px" />
                                </Table.Row>
                            </Table.Header>
                            <Table.Body>
                                {rows.map((row, index) => (
                                    <Table.Row key={row.product.id}>
                                        <Table.Cell>{row.product.brand}</Table.Cell>
                                        <Table.Cell>{row.product.model}</Table.Cell>
                                        <Table.Cell>
                                            {row.product.measure}
                                        </Table.Cell>
                                        <Table.Cell>{row.product.unit}</Table.Cell>
                                        <Table.Cell>
                                            <input
                                                type="number"
                                                min="0"
                                                step="any"
                                                value={row.quantity}
                                                onChange={(e) =>
                                                    updateQuantity(
                                                        index,
                                                        e.target.value
                                                    )
                                                }
                                                className="w-full px-2 py-1 text-right bg-white tabular-nums"
                                            />
                                            {itemError(index) && (
                                                <p className="mt-1 text-xs text-red-600">
                                                    {itemError(index)}
                                                </p>
                                            )}
                                        </Table.Cell>
                                        <Table.Cell>
                                            <Button
                                                type="button"
                                                color="red"
                                                variant="ghost"
                                                className="hover:cursor-pointer"
                                                onClick={() => removeRow(index)}
                                            >
                                                <TbTrash />
                                            </Button>
                                        </Table.Cell>
                                    </Table.Row>
                                ))}
                            </Table.Body>
                        </Table.Root>
                    )}
                </ContainerSection>
            </form>

            <ProductsModal
                open={showProductsModal}
                onClose={() => setShowProductsModal(false)}
                onAddProduct={addProduct}
            />
        </Container>
    );
};

export default StockEntryForm;
