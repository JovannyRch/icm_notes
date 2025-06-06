import Container from "@/Components/Container";
import ContainerSection from "@/Components/ContainerSection";
import InlineInput from "@/Components/InlineInput";

import InputWithLabel from "@/Components/InputWithLabel";
import LineDivider from "@/Components/LineDivider";
import NoteItem from "@/Components/NoteItem";
import ProductsModal from "@/Components/ProductsModal/ProductsModal";
import { STATUS_DELIVERY_ENUM } from "@/const";
import { formatCurrency, getToday } from "@/helpers/formatters";
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
import { useMemo, useState } from "react";
import { BiArchive, BiArrowBack, BiDollar, BiPlus } from "react-icons/bi";
import {
    MdCancel,
    MdOutlinePlaylistAdd,
    MdSave,
    MdUnarchive,
} from "react-icons/md";
import { TbCashRegister, TbTrash } from "react-icons/tb";
import { toast } from "react-toastify";
import { Inertia } from "@inertiajs/inertia";
import { SuppliedStatusSelect } from "@/Components/SuppliedStatusSelect";
import { DeliveryStatusSelect } from "@/Components/DeliveryStatusSelect";
import StatusPaidBadge from "@/Components/StatusPaidBadge";
import { confirmAlert } from "react-confirm-alert";
import { useLocalStorage } from "usehooks-ts";
import DatePicker from "react-datepicker";
import { es } from "date-fns/locale";
import { format } from "date-fns";

interface Props extends PageProps {
    branch: Branch;
    note?: Note;
    items?: NoteItemInterface[];
    date: string;
}

const today = new Date();

interface NoteFormData {
    folio: string;
    customer: string;
    notes: string;
    purchase_total: string;
    sale_total: string;
    advance: string;
    balance: string;
    cash: string;
    card: string;
    transfer: string;
    flete: string;
    branch_id: number;
    date: string;
    delivery_status: string;
    status: payment_status;
    items: NoteItemInterface[];
    cash2: string;
    card2: string;
    transfer2: string;
    second_payment_date: string;
    [key: string]: any;
}

const NoteForm = ({
    branch,
    note,
    flash,
    items: initialItems = [],
    date,
}: Props) => {
    useAlerts(flash);
    const isEdit = !!note;

    const [modalValues, setModalValues] = useState<{
        mode: "append" | "replace";
        open: boolean;
    }>({
        mode: "append",
        open: false,
    });
    const [selectedProductIndex, setSelectedProductIndex] = useState(0);

    const { data, setData, errors, post, put } = useForm<NoteFormData>({
        folio: isEdit ? note?.folio : "",
        customer: isEdit ? note?.customer : "",
        sale_total: String(isEdit ? note?.sale_total : 0),
        purchase_total: String(isEdit ? note?.purchase_total : 0),
        notes: isEdit ? note?.notes : "",
        cash: String(isEdit ? note?.cash ?? 0 : "0"),
        card: String(isEdit ? note?.card ?? 0 : "0"),
        transfer: String(isEdit ? note?.transfer ?? 0 : "0"),
        advance: String(isEdit ? note?.advance ?? 0 : "0"),
        flete: String(isEdit ? note?.flete ?? 0 : "0"),
        balance: String(isEdit ? note?.balance ?? 0 : "0"),
        branch_id: branch.id,
        status: isEdit ? (note?.status as payment_status) : "pending",
        purchase_status: isEdit
            ? (note?.purchase_status as payment_status)
            : "pending",
        date: isEdit ? note?.date : getToday(),
        delivery_status: isEdit
            ? note?.delivery_status
            : STATUS_DELIVERY_ENUM.PENDING,
        items: initialItems,
        cash2: String(isEdit ? note?.cash2 ?? 0 : "0"),
        card2: String(isEdit ? note?.card2 ?? 0 : "0"),
        transfer2: String(isEdit ? note?.transfer2 ?? 0 : "0"),
        second_payment_date: isEdit
            ? !note?.second_payment_date
                ? date
                : note?.second_payment_date
            : date,
    });

    const productsSubtotal = useMemo(() => {
        return data.items.reduce(
            (acc, item) => acc + Number(item.sale_subtotal),
            0
        );
    }, [data.items]);

    const {
        items,
        flete,
        cash,
        card,
        transfer,
        delivery_status,
        cash2,
        card2,
        transfer2,
    } = data;

    const setCalculatedValues = (items: NoteItemInterface[]) => {
        const isCancelled =
            data.delivery_status === STATUS_DELIVERY_ENUM.CANCELED &&
            data.status === "canceled";

        if (isCancelled) {
            setData("transfer", "0");
            setData("cash", "0");
            setData("card", "0");
            setData("transfer2", "0");
            setData("cash2", "0");
            setData("card2", "0");
        }

        const purchaseTotal = items.reduce(
            (acc, item) => acc + item.purchase_subtotal,
            0
        );
        const saleTotal = isCancelled
            ? 0
            : items.reduce((acc, item) => acc + Number(item.sale_subtotal), 0) +
              Number(data.flete ?? 0);

        const { card, cash, transfer, card2, cash2, transfer2 } = data;
        const advance = isCancelled
            ? 0
            : Number(card ?? 0) +
              Number(cash ?? 0) +
              Number(transfer ?? 0) +
              Number(card2 ?? 0) +
              Number(cash2 ?? 0) +
              Number(transfer2 ?? 0);

        const balance = saleTotal - advance;

        setData("advance", String(advance));
        setData("purchase_total", String(purchaseTotal));
        setData("sale_total", String(saleTotal));
        setData("balance", String(balance));
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
            put(route("notes.update", note?.id), {
                onFinish: () => {
                    router.visit(route("notes.show", note?.id));
                },
                preserveScroll: true,
            });
        } else {
            post(route("notes.store"), { preserveScroll: true });
        }
    };

    const handleDelete = () => {
        confirmAlert({
            title: "Eliminar nota",
            message: "¿Estás seguro de eliminar esta nota?",
            buttons: [
                {
                    label: "Sí",
                    onClick: () => {
                        Inertia.post(route("notes.destroy", note?.id));
                    },
                },
                {
                    label: "No",
                    onClick: () => {},
                },
            ],
        });
    };

    const handleArchive = () => {
        Inertia.patch(route("notes.archive", note?.id));
    };

    const createNoteItemFromProduct = (product: Product) => {
        const productInterface: NoteItemInterface = {
            product_id: product.id,
            brand: product.brand,
            model: product.model,
            measure: product.measure,
            mc: product.mc,
            unit: product.unit,
            cost: product.cost,
            price: product.price,
            iva: product.iva,
            extra: product.extra,
            stock: product.stock,
            supplied_status: "no_enviado",
            delivery_status: STATUS_DELIVERY_ENUM.PENDING,
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
        if (Object.keys(errors).length > 0) {
            const errorMessages = Object.values(errors)
                .map((error) => error)
                .join(", ");
            toast.error(errorMessages);
        }
    }, [errors]);

    useUpdateEffect(() => {
        setCalculatedValues(items);
    }, [cash, card, transfer, flete, delivery_status, card2, cash2, transfer2]);

    const [filterDate] = useLocalStorage(
        `date-filter-${branch.id}`,
        "THIS_WEEK"
    );

    return (
        <Container headTitle={isEdit ? "Editar nota" : "Crear nota"}>
            <form onSubmit={handleOnSubmit}>
                <Box className="mb-4">
                    <Flex gap="2" justify="between">
                        <Flex
                            gap="2"
                            direction={{ initial: "column", md: "row" }}
                        >
                            <Button
                                type="button"
                                color="gray"
                                variant="soft"
                                className="btn btn-secondary hover:cursor-pointer"
                                onClick={() => {
                                    router.visit(
                                        route("notas", {
                                            branch: branch.id,
                                            date: filterDate,
                                        })
                                    );
                                }}
                            >
                                Regresar al listado
                                <BiArrowBack />
                            </Button>
                            {isEdit && (
                                <>
                                    <Button
                                        type="button"
                                        color="red"
                                        variant="soft"
                                        className="btn btn-secondary hover:cursor-pointer"
                                        onClick={handleDelete}
                                    >
                                        Eliminar
                                        <TbTrash />
                                    </Button>
                                    {Boolean(note.archived) ? (
                                        <Button
                                            type="button"
                                            color="orange"
                                            variant="soft"
                                            className="btn btn-secondary hover:cursor-pointer"
                                            onClick={handleArchive}
                                        >
                                            Desarchivar
                                            <MdUnarchive />
                                        </Button>
                                    ) : (
                                        <Button
                                            type="button"
                                            color="amber"
                                            variant="soft"
                                            className="btn btn-secondary hover:cursor-pointer"
                                            onClick={handleArchive}
                                        >
                                            Archivar
                                            <BiArchive />
                                        </Button>
                                    )}
                                    <Button
                                        color="green"
                                        type="button"
                                        variant="soft"
                                        className="hover:cursor-pointer"
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
                                    <Button
                                        type="button"
                                        color="gold"
                                        variant="soft"
                                        onClick={() => {
                                            router.visit(
                                                route("cortes.new", {
                                                    branch: branch.id,
                                                })
                                            );
                                        }}
                                        className="hover:cursor-pointer"
                                    >
                                        Generar Corte
                                        <TbCashRegister className="w-5 h-5" />
                                    </Button>
                                </>
                            )}
                        </Flex>
                        <Flex
                            gap="4"
                            direction={{ initial: "column", md: "row" }}
                        >
                            {isEdit && (
                                <Button
                                    type="button"
                                    color="gray"
                                    className="btn btn-secondary hover:cursor-pointer"
                                    variant="soft"
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

                            <Button
                                type="submit"
                                className="btn btn-primary hover:cursor-pointer"
                            >
                                {isEdit ? "Guardar cambios" : "Crear nota"}
                                <MdSave />
                            </Button>
                        </Flex>
                    </Flex>
                </Box>

                <Grid columns="9" gap="2">
                    <Grid gridColumn="span 7">
                        <Flex direction="column" gap="2">
                            <Grid columns="9" gap="2">
                                <Grid gridColumn="span 6">
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
                                                        setData(
                                                            "date",
                                                            e.target.value
                                                        )
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
                                                        setData(
                                                            "folio",
                                                            e.target.value
                                                        )
                                                    }
                                                    error={errors.folio}
                                                />
                                            </Grid>
                                            <Grid gridColumn="span 2">
                                                <DeliveryStatusSelect
                                                    value={data.delivery_status}
                                                    isPaymentComplete={
                                                        isPaymentComplete
                                                    }
                                                    onChange={(value) => {
                                                        setData(
                                                            "delivery_status",
                                                            value
                                                        );

                                                        if (
                                                            value ===
                                                            STATUS_DELIVERY_ENUM.CANCELED
                                                        ) {
                                                            setData(
                                                                "status",
                                                                "canceled"
                                                            );
                                                        }

                                                        setItems(
                                                            items.map(
                                                                (item) => ({
                                                                    ...item,
                                                                    delivery_status:
                                                                        value,
                                                                })
                                                            )
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
                                </Grid>
                                <Grid gridColumn="span 3">
                                    <ContainerSection title="Comentarios">
                                        <TextArea
                                            value={data.notes}
                                            onChange={(e) =>
                                                setData("notes", e.target.value)
                                            }
                                            rows={8}
                                            className="w-full"
                                        />
                                    </ContainerSection>
                                </Grid>
                            </Grid>

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
                                                        className="hover:cursor-pointer"
                                                        color="green"
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
                                    {items.length > 1 && (
                                        <Flex
                                            gap="4"
                                            justify="end"
                                            className="mt-4"
                                        >
                                            {isEdit && (
                                                <Button
                                                    type="button"
                                                    color="gray"
                                                    className="btn btn-secondary hover:cursor-pointer"
                                                    onClick={() => {
                                                        router.visit(
                                                            route(
                                                                "notes.show",
                                                                {
                                                                    note: note.id,
                                                                }
                                                            )
                                                        );
                                                    }}
                                                >
                                                    Cancelar cambios{" "}
                                                    <MdCancel />
                                                </Button>
                                            )}

                                            <Button
                                                type="submit"
                                                className="btn btn-primary hover:cursor-pointer"
                                            >
                                                {isEdit
                                                    ? "Guardar cambios"
                                                    : "Crear nota"}
                                                <MdSave />
                                            </Button>
                                        </Flex>
                                    )}
                                </>
                            </ContainerSection>
                        </Flex>
                    </Grid>
                    <Grid gridColumn="span 2">
                        {data.delivery_status !==
                            STATUS_DELIVERY_ENUM.CANCELED && (
                            <div className="flex flex-col justify-start">
                                <ContainerSection title="Venta cliente">
                                    <InlineInput
                                        label="Flete"
                                        name="flete"
                                        value={data.flete}
                                        onChange={(e) => {
                                            setData("flete", e.target.value);
                                        }}
                                        leading={<BiDollar />}
                                        error={errors.flete}
                                    />
                                    <LineDivider className="my-4" />
                                    <Flex
                                        gap="2"
                                        justify="between"
                                        className="my-1"
                                        align="center"
                                    >
                                        <Text size="3" weight="medium">
                                            Subtotal productos:
                                        </Text>
                                        <Text size="3" weight="bold">
                                            {formatCurrency(
                                                Number(productsSubtotal)
                                            )}
                                        </Text>
                                    </Flex>
                                    <LineDivider className="my-4" />
                                    <Flex
                                        gap="2"
                                        justify="between"
                                        className={"mt-4"}
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
                                    <LineDivider className="my-4" />
                                    <Flex
                                        justify="end"
                                        align="center"
                                        className="mb-2"
                                    >
                                        <StatusPaidBadge
                                            label={
                                                isPaymentComplete
                                                    ? "Pagado"
                                                    : "Pago no completado"
                                            }
                                            status={data.status}
                                        />
                                    </Flex>
                                    <Flex direction="column" gap="2">
                                        <Flex
                                            justify="between"
                                            align="center"
                                            className="mb-2"
                                        >
                                            <Text size="3" weight="medium">
                                                Pagado completamente
                                            </Text>
                                            <Switch
                                                checked={isPaymentComplete}
                                                onCheckedChange={(value) => {
                                                    setIsPaymentComplete(value);
                                                    setData(
                                                        "status",
                                                        value
                                                            ? "paid"
                                                            : "pending"
                                                    );
                                                }}
                                            />
                                        </Flex>
                                        <LineDivider />

                                        <InlineInput
                                            label="Efectivo"
                                            name="cash"
                                            type="text"
                                            value={data.cash}
                                            onChange={(e) => {
                                                setData("cash", e.target.value);
                                            }}
                                            leading={<BiDollar />}
                                            error={errors.cash}
                                        />
                                        <InlineInput
                                            label="Transferencia"
                                            name="transfer"
                                            type="text"
                                            value={data.transfer}
                                            onChange={(e) => {
                                                setData(
                                                    "transfer",
                                                    e.target.value
                                                );
                                            }}
                                            leading={<BiDollar />}
                                            error={errors.transfer}
                                        />

                                        <InlineInput
                                            label="TDC/TDD"
                                            name="card"
                                            type="text"
                                            value={data.card}
                                            onChange={(e) => {
                                                setData("card", e.target.value);
                                            }}
                                            leading={<BiDollar />}
                                            error={errors.card}
                                        />

                                        <LineDivider className="my-2" />
                                        <Flex
                                            gap="2"
                                            justify="between"
                                            className="my-1"
                                            align="center"
                                        >
                                            <Text size="3" weight="medium">
                                                A/C:
                                            </Text>
                                            <Text size="3" weight="bold">
                                                {formatCurrency(
                                                    Number(data.advance)
                                                )}
                                            </Text>
                                        </Flex>

                                        <Flex
                                            gap="2"
                                            justify="between"
                                            className={
                                                Number(data.balance) < 0
                                                    ? "text-red-500"
                                                    : Number(data.balance) === 0
                                                    ? "text-green-700"
                                                    : "text-orange-500"
                                            }
                                            align="center"
                                        >
                                            <Text size="3" weight="medium">
                                                Restante:
                                            </Text>
                                            <Text size="3" weight="bold">
                                                {formatCurrency(
                                                    Number(data.balance)
                                                )}
                                            </Text>
                                        </Flex>
                                        {isEdit && (
                                            <>
                                                <LineDivider className="my-3" />

                                                <Text size="3" weight="bold">
                                                    Segundo pago
                                                </Text>

                                                <InlineInput
                                                    label="Efectivo"
                                                    name="cash"
                                                    type="text"
                                                    value={data.cash2}
                                                    onChange={(e) => {
                                                        setData(
                                                            "cash2",
                                                            e.target.value
                                                        );
                                                    }}
                                                    leading={<BiDollar />}
                                                    error={errors.cash}
                                                />
                                                <InlineInput
                                                    label="Transferencia"
                                                    name="transfer"
                                                    type="text"
                                                    value={data.transfer2}
                                                    onChange={(e) => {
                                                        setData(
                                                            "transfer2",
                                                            e.target.value
                                                        );
                                                    }}
                                                    leading={<BiDollar />}
                                                    error={errors.transfer}
                                                />

                                                <InlineInput
                                                    label="TDC/TDD"
                                                    name="card"
                                                    type="text"
                                                    value={data.card2}
                                                    onChange={(e) => {
                                                        setData(
                                                            "card2",
                                                            e.target.value
                                                        );
                                                    }}
                                                    leading={<BiDollar />}
                                                    error={errors.card}
                                                />
                                                <Flex
                                                    gap="2"
                                                    justify="between"
                                                    align="center"
                                                >
                                                    <Text
                                                        size="3"
                                                        weight="medium"
                                                    >
                                                        Fecha de pago:
                                                    </Text>
                                                    <DatePicker
                                                        locale={es}
                                                        dateFormat={
                                                            "dd/MM/yyyy"
                                                        }
                                                        className="min-w-[200px]  rounded-md h-8 px-2"
                                                        selected={
                                                            data.second_payment_date
                                                                ? new Date(
                                                                      data.second_payment_date +
                                                                          "T00:00"
                                                                  )
                                                                : new Date(
                                                                      today +
                                                                          "T00:00"
                                                                  )
                                                        }
                                                        onSelect={(date) => {
                                                            setData(
                                                                "second_payment_date",
                                                                format(
                                                                    date as Date,
                                                                    "yyyy-MM-dd"
                                                                )
                                                            );
                                                        }}
                                                    />
                                                </Flex>
                                            </>
                                        )}

                                        <LineDivider className="mt-2" />
                                    </Flex>
                                </ContainerSection>

                                <ContainerSection title="Compra">
                                    <Flex
                                        justify="end"
                                        align="center"
                                        className="mb-2"
                                    >
                                        <StatusPaidBadge
                                            label={
                                                isPurchaseComplete
                                                    ? "Compra liquidada"
                                                    : " Compra no liquidada"
                                            }
                                            status={data.purchase_status}
                                        />
                                    </Flex>

                                    <Flex justify="between" align="center">
                                        <Text size="3" weight="medium">
                                            Compra liquidada
                                        </Text>
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
                            </div>
                        )}
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
