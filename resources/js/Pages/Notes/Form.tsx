import Container from "@/Components/Container";
import ContainerSection from "@/Components/ContainerSection";
import InlineInput from "@/Components/InlineInput";

import InputWithLabel from "@/Components/InputWithLabel";
import LineDivider from "@/Components/LineDivider";
import NoteItem from "@/Components/NoteItem";
import ProductsModal from "@/Components/ProductsModal/ProductsModal";
import { STATUS_DELIVERY_ENUM } from "@/const";
import { formatCurrency } from "@/helpers/formatters";
import {
    calculatePurchaseSubtotal,
    calculateSaleSubtotal,
} from "@/helpers/utils";
import useAlerts from "@/hooks/useAlerts";
import { useUpdateEffect } from "@/hooks/useUpdateEffect";
import { payment_status } from "@/types";
import { PageProps } from "@/types";
import { Branch } from "@/types/Branch";
import { Note } from "@/types/Note";
import { NoteItemInterface } from "@/types/NoteItem";
import { Product } from "@/types/Product";
import { router, useForm } from "@inertiajs/react";
import {
    Badge,
    Box,
    Button,
    Flex,
    Grid,
    Strong,
    Switch,
    Text,
    TextArea,
} from "@radix-ui/themes";
import { useState } from "react";
import { BiArchive, BiArrowBack, BiDollar, BiPlus } from "react-icons/bi";
import {
    MdCancel,
    MdOutlinePlaylistAdd,
    MdSave,
    MdUnarchive,
} from "react-icons/md";
import { TbTrash } from "react-icons/tb";
import { toast } from "react-toastify";
import { Inertia } from "@inertiajs/inertia";
import { SuppliedStatusSelect } from "@/Components/SuppliedStatusSelect";
import { DeliveryStatusSelect } from "@/Components/DeliveryStatusSelect";

interface Props extends PageProps {
    branch: Branch;
    note?: Note;
    items?: NoteItemInterface[];
}

interface NoteFormData {
    folio: string;
    customer: string;
    notes: string;
    purchase_total: string;
    sale_total: string;
    advance: string;
    balance: string;
    flete: string;
    branch_id: number;
    date: string;
    delivery_status: string;
    payment_method: string;
    status: payment_status;
    items: NoteItemInterface[];
    [key: string]: any;
}

const NoteForm = ({ branch, note, flash, items: initialItems = [] }: Props) => {
    const isEdit = !!note;

    useAlerts(flash);

    const [modalValues, setModalValues] = useState<{
        mode: "append" | "replace";
        open: boolean;
    }>({
        mode: "append",
        open: false,
    });
    const [selectedProductIndex, setSelectedProductIndex] = useState(0);

    const {
        data,
        setData,
        errors,
        post,
        put,
        delete: deleteNote,
    } = useForm<NoteFormData>({
        folio: isEdit ? note?.folio : "",
        customer: isEdit ? note?.customer : "",
        sale_total: String(isEdit ? note?.sale_total : 0),
        purchase_total: String(isEdit ? note?.purchase_total : 0),
        notes: isEdit ? note?.notes : "",
        advance: String(isEdit ? note?.advance : "0"),
        flete: String(isEdit ? note?.flete ?? 0 : "0"),
        balance: String(isEdit ? note?.balance : "0"),
        branch_id: branch.id,
        status: isEdit ? (note?.status as payment_status) : "pending",
        purchase_status: isEdit
            ? (note?.purchase_status as payment_status)
            : "pending",
        date: isEdit ? note?.date : new Date().toISOString().split("T")[0],
        delivery_status: STATUS_DELIVERY_ENUM.DELIVERED,

        items: initialItems,
        payment_method: "efectivo",
    });

    const { items, advance, flete } = data;

    const setCalculatedValues = (items: NoteItemInterface[]) => {
        const purchaseTotal = items.reduce(
            (acc, item) => acc + item.purchase_subtotal,
            0
        );
        const saleTotal = items.reduce(
            (acc, item) => acc + item.sale_subtotal,
            0
        );

        setData("purchase_total", String(purchaseTotal));
        setData("sale_total", String(saleTotal + Number(data.flete ?? 0)));
        setData("balance", String(saleTotal - Number(data.advance)));
    };

    const setItems = (items: NoteItemInterface[]) => {
        setData("items", items);
        setCalculatedValues(items);
    };

    const [isPaymentComplete, setIsPaymentComplete] = useState(
        isEdit ? note?.status === "paid" : false
    );
    const [isPurchaseComplete, setIsPurchaseComplete] = useState(
        isEdit ? note?.purchase_status === "paid" : false
    );

    const handleOnSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (isEdit) {
            put(route("notes.update", note?.id));
        } else {
            post(route("notes.store"));
        }
    };

    const handleDelete = () => {
        if (confirm("¿Estás seguro de eliminar esta nota?")) {
            deleteNote(route("notes.destroy", note?.id));
        }
    };

    const handleArchive = () => {
        Inertia.patch(route("notes.archive", note?.id));
    };

    const createNoteItemFromProduct = (product: Product) => {
        const productInterface: NoteItemInterface = {
            product_id: product.id,
            type: product.type,
            code: product.code,
            brand: product.brand,
            model: product.model,
            measure: product.measure,
            description: product.description,
            mc: product.mc,
            unit: product.unit,
            cost: product.cost,
            price: product.price,
            iva: product.iva,
            extra: product.extra,
            stock: product.stock,
            supplied_status: "no_enviado",
            delivery_status: "entregado_a_cliente",
            quantity: 1,
            purchase_subtotal: 0,
            sale_subtotal: 0,
        };

        return {
            ...productInterface,
            purchase_subtotal: calculatePurchaseSubtotal(productInterface),
            sale_subtotal: calculateSaleSubtotal(productInterface),
        };
    };

    useUpdateEffect(() => {
        console.log("data", data);
    }, [data]);

    useUpdateEffect(() => {
        if (Object.keys(errors).length > 0) {
            const errorMessages = Object.values(errors)
                .map((error) => error)
                .join(", ");
            toast.error(errorMessages);
        }
    }, [errors]);

    useUpdateEffect(() => {
        setCalculatedValues(items);

        if (
            !isNaN(Number(advance)) &&
            Number(advance) !== 0 &&
            Number(advance) >= Number(data.sale_total)
        ) {
            setIsPaymentComplete(true);
        }
    }, [advance]);

    useUpdateEffect(() => {
        setCalculatedValues(items);
    }, [flete]);

    useUpdateEffect(() => {
        console.log("data", data);
    }, [data]);

    return (
        <Container headTitle={isEdit ? "Editar nota" : "Crear nota"}>
            <form onSubmit={handleOnSubmit}>
                <Box className="mb-4">
                    <Flex gap="2" justify="between">
                        <Flex gap="2">
                            <Button
                                type="button"
                                color="gray"
                                className="btn btn-secondary"
                                onClick={() => {
                                    router.visit(
                                        route("branches.notes", branch.id)
                                    );
                                }}
                            >
                                Regresar a la lista
                                <BiArrowBack />
                            </Button>
                            {isEdit && (
                                <>
                                    <Button
                                        type="button"
                                        color="red"
                                        className="btn btn-secondary"
                                        onClick={handleDelete}
                                    >
                                        Eliminar
                                        <TbTrash />
                                    </Button>
                                    {Boolean(note.archived) ? (
                                        <Button
                                            type="button"
                                            color="orange"
                                            className="btn btn-secondary"
                                            onClick={handleArchive}
                                        >
                                            Desarchivar
                                            <MdUnarchive />
                                        </Button>
                                    ) : (
                                        <Button
                                            type="button"
                                            color="amber"
                                            className="btn btn-secondary"
                                            onClick={handleArchive}
                                        >
                                            Archivar
                                            <BiArchive />
                                        </Button>
                                    )}
                                    <Button
                                        color="green"
                                        type="button"
                                        onClick={() => {
                                            router.visit(
                                                route("notes.create", {
                                                    branch: branch.id,
                                                })
                                            );
                                        }}
                                    >
                                        Nueva nota
                                        <BiPlus />
                                    </Button>
                                </>
                            )}
                        </Flex>
                        <Flex gap="4">
                            {isEdit && (
                                <Button
                                    type="button"
                                    color="gray"
                                    className="btn btn-secondary"
                                    onClick={() => {
                                        router.visit(
                                            route("notes.show", {
                                                note: note.id,
                                            })
                                        );
                                    }}
                                >
                                    Cancelar cambios <MdCancel />
                                </Button>
                            )}

                            <Button type="submit" className="btn btn-primary">
                                {isEdit ? "Guardar cambios" : "Crear nota"}
                                <MdSave />
                            </Button>
                        </Flex>
                    </Flex>
                </Box>

                <Grid columns="9" gap="2">
                    <Grid gridColumn="span 7">
                        <Flex direction="column" gap="2">
                            <ContainerSection title="Detalles de la nota">
                                <Grid columns="3" gap="3">
                                    <Grid gridColumn="span 2">
                                        <InputWithLabel
                                            label="Sucursal"
                                            name="branch"
                                            value={branch.name}
                                            readonly
                                        />
                                    </Grid>

                                    <Grid gridColumn="span 1">
                                        <InputWithLabel
                                            label="Fecha"
                                            name="date"
                                            type="date"
                                            value={String(data.date)}
                                            onChange={(e) =>
                                                setData("date", e.target.value)
                                            }
                                            error={errors.date}
                                        />
                                    </Grid>

                                    <Grid gridColumn="span 1">
                                        <InputWithLabel
                                            label="No. Nota"
                                            name="note_number"
                                            type="text"
                                            value={data.folio}
                                            onChange={(e) =>
                                                setData("folio", e.target.value)
                                            }
                                            error={errors.folio}
                                        />
                                    </Grid>
                                    <Grid gridColumn="span 2">
                                        <DeliveryStatusSelect
                                            value={data.delivery_status}
                                            onChange={(value) => {
                                                setData(
                                                    "delivery_status",
                                                    value
                                                );
                                            }}
                                        />
                                    </Grid>
                                    <Grid gridColumn="span 3" gap="2">
                                        <InputWithLabel
                                            label="Cliente"
                                            name="customer"
                                            type="text"
                                            value={data.customer}
                                            onChange={(e) =>
                                                setData(
                                                    "customer",
                                                    e.target.value
                                                )
                                            }
                                            error={errors.customer}
                                        />
                                    </Grid>
                                </Grid>
                            </ContainerSection>

                            <ContainerSection
                                title="Productos"
                                className="pt-8"
                            >
                                <>
                                    {items.map((item, index) => (
                                        <div key={`item-${index}`}>
                                            <NoteItem
                                                item={item}
                                                index={index}
                                                onDelete={(index: number) => {
                                                    setItems(
                                                        items.filter(
                                                            (_, i) =>
                                                                i !== index
                                                        )
                                                    );
                                                }}
                                                isEdit={isEdit}
                                                onOpenSearchModal={(
                                                    position
                                                ) => {
                                                    setSelectedProductIndex(
                                                        position
                                                    );
                                                    setModalValues({
                                                        mode: "replace",
                                                        open: true,
                                                    });
                                                }}
                                                onUpdate={(index, item) => {
                                                    setItems(
                                                        items.map((i, idx) =>
                                                            idx === index
                                                                ? item
                                                                : i
                                                        )
                                                    );
                                                }}
                                            />
                                        </div>
                                    ))}
                                    <div className="mt-4">
                                        <Grid columns="9">
                                            <Grid gridColumn="span 9">
                                                <div className="flex justify-end w-full">
                                                    <Button
                                                        type="button"
                                                        onClick={() => {
                                                            setModalValues({
                                                                mode: "append",
                                                                open: true,
                                                            });
                                                        }}
                                                    >
                                                        Agregar producto
                                                        <MdOutlinePlaylistAdd className="w-5 h-5" />
                                                    </Button>
                                                </div>
                                            </Grid>
                                        </Grid>
                                    </div>
                                </>
                            </ContainerSection>
                        </Flex>
                    </Grid>
                    <Grid gridColumn="span 2">
                        <div className="flex flex-col justify-start">
                            <ContainerSection title="Pago">
                                <Flex
                                    justify="end"
                                    align="center"
                                    className="mb-2"
                                >
                                    {isPaymentComplete ? (
                                        <Badge color="green">Pagado</Badge>
                                    ) : (
                                        <Badge color="orange">
                                            Pago pendiente
                                        </Badge>
                                    )}
                                </Flex>
                                <Flex direction="column" gap="2">
                                    <Flex justify="between" align="center">
                                        <Text size="3">Pago completado</Text>
                                        <Switch
                                            checked={isPaymentComplete}
                                            onCheckedChange={(value) => {
                                                setIsPaymentComplete(value);
                                                setData(
                                                    "status",
                                                    value ? "paid" : "pending"
                                                );
                                                if (value) {
                                                    setData(
                                                        "advance",
                                                        data.sale_total
                                                    );
                                                    setData("balance", "0");
                                                } else {
                                                    setData("advance", "0");
                                                    setData(
                                                        "balance",
                                                        data.sale_total
                                                    );
                                                }
                                            }}
                                        />
                                    </Flex>

                                    {!isPaymentComplete && (
                                        <>
                                            <LineDivider />
                                            <InlineInput
                                                label="A/C"
                                                name="advance"
                                                type="text"
                                                value={data.advance}
                                                onChange={(e) => {
                                                    setData(
                                                        "advance",
                                                        e.target.value
                                                    );
                                                }}
                                                leading={<BiDollar />}
                                                error={errors.advance}
                                            />

                                            <Flex
                                                gap="2"
                                                justify="between"
                                                className="my-2"
                                                align="center"
                                            >
                                                <Text size="3">Restan:</Text>
                                                <Text size="3" weight="bold">
                                                    {formatCurrency(
                                                        Number(data.balance)
                                                    )}
                                                </Text>
                                            </Flex>
                                        </>
                                    )}
                                    <InlineInput
                                        label="Flete"
                                        name="flete"
                                        type="text"
                                        value={data.flete}
                                        onChange={(e) => {
                                            setData("flete", e.target.value);
                                        }}
                                        leading={<BiDollar />}
                                        error={errors.flete}
                                    />
                                    <LineDivider className="mt-2 mb-4" />
                                    <Flex
                                        gap="2"
                                        justify="between"
                                        className={
                                            isPaymentComplete ? "mt-4" : "mt-4"
                                        }
                                        align="center"
                                    >
                                        <Text size="5">
                                            <Strong>Total venta: </Strong>
                                        </Text>
                                        <Text size="5" weight="bold">
                                            {formatCurrency(
                                                Number(data.sale_total)
                                            )}
                                        </Text>
                                    </Flex>
                                </Flex>
                            </ContainerSection>
                            <ContainerSection title="Compra">
                                <Flex
                                    justify="end"
                                    align="center"
                                    className="mb-2"
                                >
                                    {isPurchaseComplete ? (
                                        <Badge color="green">
                                            Compra liquidada
                                        </Badge>
                                    ) : (
                                        <Badge color="orange">
                                            Compra no liquidada
                                        </Badge>
                                    )}
                                </Flex>

                                <Flex justify="between" align="center">
                                    <Text size="3">Compra liquidada</Text>
                                    <Switch
                                        checked={isPurchaseComplete}
                                        onCheckedChange={(value) => {
                                            setIsPurchaseComplete(value);
                                            setData(
                                                "purchase_status",
                                                value ? "paid" : "pending"
                                            );
                                        }}
                                    />
                                </Flex>

                                <LineDivider className="mt-4 mb-4" />
                                <Flex
                                    gap="2"
                                    justify="between"
                                    className="mt-2 mb-2"
                                    align="center"
                                >
                                    <Text size="5">
                                        <Strong>Total compra: </Strong>
                                    </Text>
                                    <Text size="5" weight="bold">
                                        {formatCurrency(
                                            Number(data.purchase_total)
                                        )}
                                    </Text>
                                </Flex>
                            </ContainerSection>

                            <ContainerSection title="Comentarios">
                                <TextArea
                                    value={data.notes}
                                    onChange={(e) =>
                                        setData("notes", e.target.value)
                                    }
                                    rows={5}
                                    className="w-full"
                                />
                            </ContainerSection>
                        </div>
                    </Grid>
                </Grid>
            </form>
            <ProductsModal
                onClose={() => setModalValues({ ...modalValues, open: false })}
                open={modalValues.open}
                mode={modalValues.mode}
                onAddProduct={(product) => {
                    setItems([...items, createNoteItemFromProduct(product)]);
                }}
                onReplaceProduct={(product) => {
                    setItems(
                        items.map((item, index) =>
                            index === selectedProductIndex
                                ? createNoteItemFromProduct(product)
                                : item
                        )
                    );
                }}
            />
        </Container>
    );
};

export default NoteForm;
