import Container from "@/Components/Container";
import InputWithLabel from "@/Components/InputWithLabel";
import Modal from "@/Components/Modal";
import Pagination from "@/Components/Pagination";
import UnitInput from "@/Components/UnitInput";
import { isNumber } from "@/helpers/utils";
import useAlerts from "@/hooks/useAlerts";
import { useBranch } from "@/hooks/useBranch";
import { PageProps } from "@/types";
import { Product } from "@/types/Product";
import { Inertia } from "@inertiajs/inertia";
import { Link, router, useForm } from "@inertiajs/react";
import { Button, Grid, Table, Tabs } from "@radix-ui/themes";
import { useState } from "react";
import { confirmAlert } from "react-confirm-alert";
import { BiArrowBack, BiArrowToRight, BiSave, BiTrash } from "react-icons/bi";
import { BiDownArrowAlt, BiUpArrowAlt, BiTransfer } from "react-icons/bi";
import { MdOutlineEdit } from "react-icons/md";
import { BiPlus } from "react-icons/bi";
import StockMovementForm from "./components/StockMovementForm";
import { useUpdateEffect } from "@/hooks/useUpdateEffect";

interface FormProps extends PageProps {
    product?: Product;
    stockMovements?: any;
}

const movementIcons = {
    IN: <BiDownArrowAlt className="inline-block w-5 h-5 ml-1 text-green-600" />,
    OUT: <BiUpArrowAlt className="inline-block w-5 h-5 ml-1 text-red-600" />,
    TRANSFER_IN: (
        <BiTransfer className="inline-block w-5 h-5 ml-1 text-blue-600" />
    ),
    TRANSFER_OUT: (
        <BiTransfer className="inline-block w-5 h-5 ml-1 text-orange-600 rotate-180" />
    ),
    ADJUSTMENT: (
        <MdOutlineEdit className="inline-block w-5 h-5 ml-1 text-purple-600" />
    ),
};

const Form = ({
    product,
    stockMovements: stockMovementsWithPagination = [],
    flash,
}: FormProps) => {
    const isEdit = !!product;
    const { data: stockMovements } = stockMovementsWithPagination;
    const [showMovementModal, setShowMovementModal] = useState(false);

    useAlerts(flash);

    const { currentBranchName } = useBranch();

    const { data, setData, errors, put, post } = useForm({
        brand: product ? product.brand : "",
        model: product ? product.model : "",
        measure: product ? product.measure : "",
        mc: product ? product.mc : "",
        unit: product ? product.unit : "",
        cost: String(product ? product.cost : 0),
        iva: String(product ? product.iva : 16),
        price: String(product ? product.price : 0),
        extra: String(product ? product.extra : 0),
        stock: String(
            isNumber(product?.stock?.quantity)
                ? Number(product?.stock?.quantity)
                : "-"
        ),
    });

    const submit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (isEdit) {
            put(route("products.update", product!.id), {
                onSuccess: () => {
                    router.reload();
                },
            });
        } else {
            post(route("products.store"), {
                onSuccess: () => {
                    router.reload();
                },
            });
        }
    };

    const handleOnDelete = () => {
        confirmAlert({
            title: "Eliminar producto",
            message: "¿Estás seguro de eliminar este producto?",
            buttons: [
                {
                    label: "Sí",
                    onClick: () => {
                        Inertia.delete(route("products.destroy", product!.id));
                    },
                },
                {
                    label: "No",
                    onClick: () => {},
                },
            ],
        });
    };

    const checkCurrentTab = () => {
        const urlParams = new URLSearchParams(window.location.search);
        const tab = urlParams.get("tab");
        return tab === "movements" ? "movements" : "data";
    };

    useUpdateEffect(() => {
        if (product) {
            setData(
                "stock",
                String(
                    isNumber(product?.stock?.quantity)
                        ? Number(product?.stock?.quantity)
                        : "-"
                )
            );
        }
    }, [product?.stock?.quantity]);

    return (
        <Container headTitle={isEdit ? "Editar Producto" : "Nuevo Producto"}>
            <div className="px-12 mb-8">
                <Tabs.Root
                    defaultValue={checkCurrentTab()}
                    orientation="horizontal"
                >
                    <Tabs.List>
                        <Tabs.Trigger
                            value="data"
                            onClick={() => {
                                //remove tab param from url
                                const url = new URL(window.location.href);
                                url.searchParams.delete("tab");
                                window.history.pushState({}, "", url);
                            }}
                        >
                            <b>Datos del producto</b>
                        </Tabs.Trigger>
                        {isEdit && (
                            <Tabs.Trigger
                                value="movements"
                                onClick={() => {
                                    //add param to url
                                    const url = new URL(window.location.href);
                                    url.searchParams.set("tab", "movements");
                                    window.history.pushState({}, "", url);
                                }}
                            >
                                <b>Movimientos de inventario</b>
                            </Tabs.Trigger>
                        )}
                    </Tabs.List>
                    <Tabs.Content value="data">
                        <div className="flex flex-col justify-center mt-10 ">
                            <div className="flex gap-4 mb-8">
                                <Button
                                    type="button"
                                    color="gray"
                                    onClick={() => {
                                        router.visit(route("products"));
                                    }}
                                >
                                    Regresar a la lista
                                    <BiArrowBack className="w-4 h-4 " />
                                </Button>
                                {isEdit && (
                                    <Button
                                        color="red"
                                        onClick={handleOnDelete}
                                    >
                                        Eliminar
                                        <BiTrash className="w-4 h-4 " />
                                    </Button>
                                )}
                            </div>
                            <div className="flex justify-between ">
                                <h2 className="text-xl font-semibold text-gray-800">
                                    {isEdit
                                        ? product!.brand + " " + product!.model
                                        : "Nuevo Producto"}
                                </h2>
                            </div>
                            <div className="flex ">
                                <form onSubmit={submit} className="mt-4 ">
                                    <Grid
                                        gap="4"
                                        columns="4"
                                        className="w-full"
                                        gapY="4"
                                    >
                                        <Grid gridColumn="span 1">
                                            <InputWithLabel
                                                label="Marca"
                                                name="brand"
                                                value={data.brand}
                                                onChange={(e) =>
                                                    setData(
                                                        "brand",
                                                        e.target.value
                                                    )
                                                }
                                                error={errors.brand}
                                            />
                                        </Grid>

                                        <Grid gridColumn="span 4">
                                            <InputWithLabel
                                                label="Modelo"
                                                name="model"
                                                value={data.model}
                                                onChange={(e) =>
                                                    setData(
                                                        "model",
                                                        e.target.value
                                                    )
                                                }
                                                error={errors.model}
                                            />
                                        </Grid>
                                        <Grid gridColumn="span 1">
                                            <InputWithLabel
                                                label="Medida"
                                                name="measure"
                                                value={data.measure}
                                                onChange={(e) =>
                                                    setData(
                                                        "measure",
                                                        e.target.value
                                                    )
                                                }
                                                error={errors.measure}
                                            />
                                        </Grid>
                                        <Grid gridColumn="span 1">
                                            <InputWithLabel
                                                label="MC"
                                                name="mc"
                                                value={data.mc}
                                                onChange={(e) =>
                                                    setData(
                                                        "mc",
                                                        e.target.value
                                                    )
                                                }
                                                error={errors.mc}
                                            />
                                        </Grid>
                                        <Grid gridColumn="span 1">
                                            <UnitInput
                                                value={data.unit}
                                                onChange={(value) =>
                                                    setData("unit", value)
                                                }
                                            />
                                        </Grid>
                                        <Grid gridColumn="span 1">
                                            <InputWithLabel
                                                label="Precio público ($)"
                                                name="price"
                                                type="text"
                                                value={data.price}
                                                onChange={(e) =>
                                                    setData(
                                                        "price",
                                                        e.target.value
                                                    )
                                                }
                                                error={errors.price}
                                            />
                                        </Grid>
                                        <Grid gridColumn="span 1">
                                            <InputWithLabel
                                                label="Costo ($)"
                                                name="cost"
                                                type="text"
                                                value={data.cost}
                                                onChange={(e) =>
                                                    setData(
                                                        "cost",
                                                        e.target.value
                                                    )
                                                }
                                                error={errors.cost}
                                            />
                                        </Grid>
                                        <Grid gridColumn="span 1">
                                            <InputWithLabel
                                                label="IVA (%)"
                                                name="iva"
                                                type="text"
                                                value={data.iva}
                                                onChange={(e) =>
                                                    setData(
                                                        "iva",
                                                        e.target.value
                                                    )
                                                }
                                                error={errors.iva}
                                            />
                                        </Grid>

                                        <Grid gridColumn="span 1">
                                            <InputWithLabel
                                                label="Extra (%)"
                                                name="extra"
                                                type="text"
                                                value={data.extra}
                                                onChange={(e) =>
                                                    setData(
                                                        "extra",
                                                        e.target.value
                                                    )
                                                }
                                                error={errors.extra}
                                            />
                                        </Grid>
                                        <Grid gridColumn="span 1">
                                            <InputWithLabel
                                                label={`Existencias / Sucursal ${currentBranchName}`}
                                                name="stock"
                                                type="text"
                                                value={data.stock}
                                                onChange={(e) =>
                                                    setData(
                                                        "stock",
                                                        e.target.value
                                                    )
                                                }
                                                error={errors.stock}
                                            />
                                        </Grid>
                                        <Grid
                                            gridColumn="span 4"
                                            className="pt-4"
                                        >
                                            <div className="flex justify-end">
                                                <Button
                                                    type="submit"
                                                    color="green"
                                                >
                                                    {isEdit
                                                        ? "Actualizar"
                                                        : "Guardar"}
                                                    <BiSave className="w-4 h-4 " />
                                                </Button>
                                            </div>
                                        </Grid>
                                    </Grid>
                                </form>
                            </div>
                        </div>
                    </Tabs.Content>

                    <Tabs.Content value="movements">
                        <div className="flex items-center justify-between mt-10 mb-4">
                            <h2 className="text-xl font-semibold text-gray-800">
                                Movimientos de inventario - Sucursal:{" "}
                                {currentBranchName}
                            </h2>
                            <Button
                                color="green"
                                onClick={() => setShowMovementModal(true)}
                            >
                                Nuevo Movimiento
                                <BiPlus className="w-5 h-5" />
                            </Button>
                        </div>

                        <h3 className="mb-6 font-medium text-gray-600 text-md">
                            Existencias actual:{" "}
                            {isNumber(product?.stock?.quantity)
                                ? Number(product?.stock?.quantity)
                                : "-"}
                        </h3>

                        <Table.Root>
                            <Table.Header>
                                <Table.Row>
                                    <Table.ColumnHeaderCell>
                                        Fecha
                                    </Table.ColumnHeaderCell>
                                    <Table.ColumnHeaderCell>
                                        Sucursal
                                    </Table.ColumnHeaderCell>
                                    <Table.ColumnHeaderCell>
                                        Tipo
                                    </Table.ColumnHeaderCell>

                                    <Table.ColumnHeaderCell>
                                        Cantidad
                                    </Table.ColumnHeaderCell>

                                    <Table.ColumnHeaderCell>
                                        Descripción
                                    </Table.ColumnHeaderCell>
                                </Table.Row>
                            </Table.Header>
                            <Table.Body>
                                {(stockMovements as []).length === 0 && (
                                    <Table.Row>
                                        <Table.Cell
                                            className="h-20 py-4 text-center"
                                            colSpan={6}
                                        >
                                            <span className="text-gray-500 h-100">
                                                No hay movimientos de inventario
                                                para este producto.
                                            </span>
                                        </Table.Cell>
                                    </Table.Row>
                                )}

                                {(stockMovements as StockMovement[]).map(
                                    (m) => (
                                        <Table.Row key={m.id}>
                                            <Table.Cell>
                                                {new Date(
                                                    m.created_at
                                                ).toLocaleString()}
                                            </Table.Cell>
                                            <Table.Cell>
                                                {m.branch?.name ?? "-"}
                                            </Table.Cell>
                                            <Table.Cell>
                                                {m.movement_type === "IN" &&
                                                    "Entrada"}
                                                {m.movement_type === "OUT" &&
                                                    "Salida"}
                                                {m.movement_type ===
                                                    "TRANSFER_IN" &&
                                                    "Traspaso Entrada"}
                                                {m.movement_type ===
                                                    "TRANSFER_OUT" &&
                                                    "Traspaso Salida"}
                                                {m.movement_type ===
                                                    "ADJUSTMENT" && "Ajuste"}

                                                {
                                                    movementIcons[
                                                        m.movement_type as keyof typeof movementIcons
                                                    ]
                                                }
                                            </Table.Cell>

                                            <Table.Cell>
                                                {isNumber(m.quantity)
                                                    ? Number(m.quantity)
                                                    : "-"}
                                            </Table.Cell>

                                            <Table.Cell>
                                                {m.description ?? "-"}
                                                {m.note_id && (
                                                    <a
                                                        href={route(
                                                            "notes.show",
                                                            m.note_id
                                                        )}
                                                        target="_blank"
                                                        className="flex items-center gap-2 text-blue-500 hover:underline"
                                                    >
                                                        Ver nota
                                                        <BiArrowToRight className="inline-block w-4 h-4 ml-1" />
                                                    </a>
                                                )}
                                            </Table.Cell>
                                        </Table.Row>
                                    )
                                )}
                            </Table.Body>
                        </Table.Root>
                        <Pagination pagination={stockMovementsWithPagination} />
                    </Tabs.Content>
                </Tabs.Root>

                {/* Modal para nuevo movimiento */}
                <Modal
                    show={showMovementModal}
                    onClose={() => setShowMovementModal(false)}
                    maxWidth="lg"
                >
                    {product && (
                        <StockMovementForm
                            product={product}
                            onClose={() => setShowMovementModal(false)}
                        />
                    )}
                </Modal>
            </div>
        </Container>
    );
};

export default Form;
