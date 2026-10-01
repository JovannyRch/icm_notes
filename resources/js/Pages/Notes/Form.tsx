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
    effectiveExtra,
} from "@/helpers/utils";
import useAlerts from "@/hooks/useAlerts";
import { useUpdateEffect } from "@/hooks/useUpdateEffect";
import { payment_status } from "@/types";
import { PageProps } from "@/types";
import { Note } from "@/types/Note";
import { NoteItemInterface } from "@/types/NoteItem";
import { NotePayment, PaymentInput } from "@/types/NotePayment";
import { Product } from "@/types/Product";
import { router, useForm } from "@inertiajs/react";
import {
    Badge,
    Box,
    Button,
    DropdownMenu,
    Flex,
    Grid,
    IconButton,
    Strong,
    Switch,
    Text,
    TextArea,
} from "@radix-ui/themes";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { BiArchive, BiArrowBack, BiDollar, BiPlus } from "react-icons/bi";
import {
    MdCancel,
    MdOutlinePlaylistAdd,
    MdSave,
    MdUnarchive,
} from "react-icons/md";
import { TbCashRegister, TbTrash } from "react-icons/tb";
import { toast } from "react-toastify";
import PageHeader from "@/Components/ui/PageHeader";
import { LuArchive, LuArchiveRestore, LuCalculator, LuChevronDown, LuFilePlus, LuTrash2 } from "react-icons/lu";
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
    payments?: NotePayment[];
    date: string;
}

const emptyPayment = (date: string): PaymentInput => ({
    date,
    cash: "0",
    card: "0",
    transfer: "0",
});

const paymentsTotal = (payments: PaymentInput[]): number =>
    payments.reduce(
        (acc, payment) =>
            acc +
            Number(payment.cash || 0) +
            Number(payment.card || 0) +
            Number(payment.transfer || 0),
        0
    );

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
    status: payment_status;
    items: NoteItemInterface[];
    payments: PaymentInput[];
    [key: string]: any;
}

const NoteForm = ({
    branch,
    note,
    flash,
    items: initialItems = [],
    payments: initialPayments = [],
    date,
}: Props) => {
    useAlerts(flash);
    const isEdit = !!note;

    const noteDate = isEdit ? note?.date : getToday();

    // Siempre hay al menos una fila de pago: el "primer pago" de la nota.
    const initialPaymentRows: PaymentInput[] = initialPayments.length
        ? initialPayments.map((payment) => ({
              id: payment.id,
              date: payment.date,
              cash: String(payment.cash ?? 0),
              card: String(payment.card ?? 0),
              transfer: String(payment.transfer ?? 0),
          }))
        : [emptyPayment(noteDate)];

    const [modalValues, setModalValues] = useState<{
        mode: "append" | "replace";
        open: boolean;
    }>({
        mode: "append",
        open: false,
    });
    const [selectedProductIndex, setSelectedProductIndex] = useState(0);

    const { data, setData, errors, post, put, transform, processing } = useForm<NoteFormData>({
        folio: isEdit ? note?.folio : "",
        customer: isEdit ? note?.customer : "",
        sale_total: String(isEdit ? note?.sale_total : 0),
        purchase_total: String(isEdit ? note?.purchase_total : 0),
        notes: isEdit ? note?.notes : "",
        advance: String(isEdit ? note?.advance ?? 0 : "0"),
        flete: String(isEdit ? note?.flete ?? 0 : "0"),
        balance: String(isEdit ? note?.balance ?? 0 : "0"),
        branch_id: branch.id,
        status: isEdit ? (note?.status as payment_status) : "pending",
        purchase_status: isEdit
            ? (note?.purchase_status as payment_status)
            : "pending",
        date: noteDate,
        delivery_status: isEdit
            ? note?.delivery_status
            : STATUS_DELIVERY_ENUM.PENDING,
        items: initialItems,
        payments: initialPaymentRows,
    });

    const productsSubtotal = useMemo(() => {
        return data.items.reduce(
            (acc, item) => acc + Number(item.sale_subtotal),
            0
        );
    }, [data.items]);

    const { items, flete, delivery_status, payments } = data;

    // Clave estable para las dependencias del efecto: `payments` es un arreglo y
    // usarlo directo como dependencia vuelve a disparar el efecto en cada render.
    const paymentsKey = JSON.stringify(payments);

    const updatePayment = (
        index: number,
        field: keyof PaymentInput,
        value: string
    ) => {
        setData(
            "payments",
            data.payments.map((payment, i) =>
                i === index ? { ...payment, [field]: value } : payment
            )
        );
    };

    const addPayment = () => {
        setData("payments", [...data.payments, emptyPayment(data.date)]);
    };

    const removePayment = (index: number) => {
        const remaining = data.payments.filter((_, i) => i !== index);
        setData(
            "payments",
            remaining.length ? remaining : [emptyPayment(data.date)]
        );
    };

    const setCalculatedValues = (items: NoteItemInterface[]) => {
        const isCancelled =
            data.delivery_status === STATUS_DELIVERY_ENUM.CANCELED &&
            data.status === "canceled";

        if (isCancelled) {
            // Una nota cancelada no conserva importes. Se compara antes de escribir
            // para que el efecto que observa `payments` converja en lugar de ciclar.
            const zeroed = data.payments.map((payment) => ({
                ...payment,
                cash: "0",
                card: "0",
                transfer: "0",
            }));

            if (JSON.stringify(zeroed) !== JSON.stringify(data.payments)) {
                setData("payments", zeroed);
            }
        }

        const purchaseTotal = items.reduce(
            (acc, item) => acc + item.purchase_subtotal,
            0
        );
        const saleTotal = isCancelled
            ? 0
            : items.reduce((acc, item) => acc + Number(item.sale_subtotal), 0) +
              Number(data.flete ?? 0);

        const advance = isCancelled ? 0 : paymentsTotal(data.payments);

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

    // Bloquea doble envío: `processing` no alcanza a re-renderizar entre dos clics seguidos.
    const submittingRef = useRef(false);

    const handleOnSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (submittingRef.current) return;
        submittingRef.current = true;

        // El primer pago siempre lleva la fecha de la nota; los demás la suya.
        // Las filas sin importe no se envían.
        transform((formData) => ({
            ...formData,
            payments: formData.payments
                .map((payment, index) => ({
                    ...payment,
                    date: index === 0 ? formData.date : payment.date,
                    cash: String(Number(payment.cash || 0)),
                    card: String(Number(payment.card || 0)),
                    transfer: String(Number(payment.transfer || 0)),
                }))
                .filter(
                    (payment) =>
                        Number(payment.cash) +
                            Number(payment.card) +
                            Number(payment.transfer) >
                        0
                ),
        }));

        if (isEdit) {
            put(route("notes.update", note?.id), {
                onFinish: () => {
                    submittingRef.current = false;
                    router.visit(route("notes.show", note?.id));
                },
                preserveScroll: true,
            });
        } else {
            post(route("notes.store"), {
                preserveScroll: true,
                onFinish: () => {
                    submittingRef.current = false;
                },
            });
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
                        router.post(route("notes.destroy", note?.id));
                    },
                },
                {
                    label: "No",
                    onClick: () => {},
                },
            ],
        });
    };

    // router (Inertia 2): con el cliente legado se recargaba la página y se perdía el mensaje.
    const handleArchive = () => {
        router.patch(route("notes.archive", note?.id), {}, { preserveScroll: true });
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
            // La nota es de `branch` (la activa al crear, la de la nota al editar).
            extra: effectiveExtra(product.extra, branch?.extra_percentage ?? null),
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
    }, [paymentsKey, flete, delivery_status]);

    const [filterDate] = useLocalStorage(
        `date-filter-${branch.id}`,
        "THIS_WEEK"
    );

    // --- Aviso de existencias (informativo; no altera partidas ni el envío) ---
    // Existencias actuales en la sucursal de la nota, por producto.
    const [stockByProduct, setStockByProduct] = useState<Record<number, number | null>>({});
    // Piezas que esta nota ya tiene guardadas: ya se descontaron del stock, así que
    // al editar también cuentan como disponibles para ella.
    const savedQuantities = useMemo(() => {
        const totals: Record<number, number> = {};
        initialItems.forEach((item) => {
            if (item.product_id) totals[item.product_id] = (totals[item.product_id] ?? 0) + Number(item.quantity || 0);
        });
        return totals;
    }, []);
    const missingStockIds = useMemo(
        () =>
            Array.from(new Set(items.map((item) => item.product_id).filter((id): id is number => !!id))).filter(
                (id) => !(id in stockByProduct)
            ),
        [items, stockByProduct]
    );
    useEffect(() => {
        if (missingStockIds.length === 0) return;
        axios
            .get("/api/products/stock", { params: { branch_id: branch.id, ids: missingStockIds } })
            .then(({ data: stocks }) => setStockByProduct((current) => ({ ...current, ...stocks })))
            .catch(() => {
                // Sin aviso si falla: nunca debe estorbar la captura de la nota.
            });
    }, [missingStockIds.join(","), branch.id]);
    const requestedByProduct = useMemo(() => {
        const totals: Record<number, number> = {};
        items.forEach((item) => {
            if (item.product_id) totals[item.product_id] = (totals[item.product_id] ?? 0) + Number(item.quantity || 0);
        });
        return totals;
    }, [items]);
    const stockFor = (item: NoteItemInterface) => {
        if (!item.product_id || !(item.product_id in stockByProduct)) return undefined;
        return {
            available: Number(stockByProduct[item.product_id] ?? 0) + (savedQuantities[item.product_id] ?? 0),
            requested: requestedByProduct[item.product_id] ?? 0,
            branchName: branch.name,
        };
    };

    return (
        <Container headTitle={isEdit ? "Editar nota" : "Crear nota"}>
            <form onSubmit={handleOnSubmit}>
                <PageHeader
                    back={{ label: "Notas", href: route("notas", { date: filterDate }) }}
                    eyebrow={branch.name}
                    title={
                        isEdit ? (
                            <span className="inline-flex items-center gap-2">
                                Nota {note.folio}
                                {Boolean(note.archived) && (
                                    <span className="px-2 py-0.5 text-xs font-medium align-middle rounded-tag bg-paper text-steel">
                                        Archivada
                                    </span>
                                )}
                            </span>
                        ) : (
                            "Nueva nota de venta"
                        )
                    }
                    actions={
                        <>
                            {isEdit && (
                                <DropdownMenu.Root>
                                    <DropdownMenu.Trigger>
                                        <Button type="button" variant="outline" color="gray">
                                            Acciones
                                            <LuChevronDown />
                                        </Button>
                                    </DropdownMenu.Trigger>
                                    <DropdownMenu.Content align="end" variant="soft" color="gray">
                                        <DropdownMenu.Item
                                            onSelect={() => router.visit(route("notes.create", { branch: branch.id }))}
                                        >
                                            <LuFilePlus /> Nueva nota
                                        </DropdownMenu.Item>
                                        <DropdownMenu.Item
                                            onSelect={() => router.visit(route("cortes.new", { branch: branch.id }))}
                                        >
                                            <LuCalculator /> Generar corte
                                        </DropdownMenu.Item>
                                        <DropdownMenu.Separator />
                                        <DropdownMenu.Item onSelect={handleArchive}>
                                            {Boolean(note.archived) ? (
                                                <>
                                                    <LuArchiveRestore /> Desarchivar
                                                </>
                                            ) : (
                                                <>
                                                    <LuArchive /> Archivar
                                                </>
                                            )}
                                        </DropdownMenu.Item>
                                        <DropdownMenu.Item color="red" onSelect={handleDelete}>
                                            <LuTrash2 /> Eliminar
                                        </DropdownMenu.Item>
                                    </DropdownMenu.Content>
                                </DropdownMenu.Root>
                            )}
                            {isEdit && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    color="gray"
                                    onClick={() => router.visit(route("notes.show", { note: note.id }))}
                                >
                                    Cancelar cambios
                                </Button>
                            )}
                            <Button type="submit" disabled={processing}>
                                <MdSave />
                                {isEdit ? "Guardar cambios" : "Crear nota"}
                            </Button>
                        </>
                    }
                />

                <Grid columns={{ initial: "1", lg: "12" }} gap="4">
                    <Grid gridColumn={{ initial: "span 1", lg: "span 8" }}>
                        <Flex direction="column" gap="4">
                            <Grid columns={{ initial: "1", md: "9" }} gap="4">
                                <Grid gridColumn={{ initial: "span 1", md: "span 6" }}>
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
                                <Grid gridColumn={{ initial: "span 1", md: "span 3" }}>
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
                                                stock={stockFor(item)}
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
                                                        variant="outline"
                                                        color="gray"
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
                                                    variant="outline"
                                                    color="gray"
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

                                            <Button type="submit" disabled={processing}>
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
                    <Grid gridColumn={{ initial: "span 1", lg: "span 4" }}>
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
                                        <Text size="5" weight="bold" className="tabular-nums text-electric">
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
                                            name="payments.0.cash"
                                            type="text"
                                            value={data.payments[0]?.cash ?? "0"}
                                            onChange={(e) => {
                                                updatePayment(
                                                    0,
                                                    "cash",
                                                    e.target.value
                                                );
                                            }}
                                            leading={<BiDollar />}
                                            error={errors["payments.0.cash"]}
                                        />
                                        <InlineInput
                                            label="Transferencia"
                                            name="payments.0.transfer"
                                            type="text"
                                            value={
                                                data.payments[0]?.transfer ?? "0"
                                            }
                                            onChange={(e) => {
                                                updatePayment(
                                                    0,
                                                    "transfer",
                                                    e.target.value
                                                );
                                            }}
                                            leading={<BiDollar />}
                                            error={
                                                errors["payments.0.transfer"]
                                            }
                                        />

                                        <InlineInput
                                            label="TDC/TDD"
                                            name="payments.0.card"
                                            type="text"
                                            value={data.payments[0]?.card ?? "0"}
                                            onChange={(e) => {
                                                updatePayment(
                                                    0,
                                                    "card",
                                                    e.target.value
                                                );
                                            }}
                                            leading={<BiDollar />}
                                            error={errors["payments.0.card"]}
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
                                                    ? "text-red-600"
                                                    : Number(data.balance) === 0
                                                    ? "text-vivid-green"
                                                    : "text-tangerine"
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
                                        {data.payments
                                            .slice(1)
                                            .map((payment, offset) => {
                                                const index = offset + 1;

                                                return (
                                                    <Fragment
                                                        key={
                                                            payment.id ?? index
                                                        }
                                                    >
                                                        <LineDivider className="my-3" />

                                                        <Flex
                                                            justify="between"
                                                            align="center"
                                                        >
                                                            <Text
                                                                size="3"
                                                                weight="bold"
                                                            >
                                                                Pago{" "}
                                                                {index + 1}
                                                            </Text>
                                                            <IconButton
                                                                type="button"
                                                                color="red"
                                                                variant="soft"
                                                                size="1"
                                                                aria-label={`Eliminar pago ${
                                                                    index + 1
                                                                }`}
                                                                className="hover:cursor-pointer"
                                                                onClick={() =>
                                                                    removePayment(
                                                                        index
                                                                    )
                                                                }
                                                            >
                                                                <TbTrash />
                                                            </IconButton>
                                                        </Flex>

                                                        <InlineInput
                                                            label="Efectivo"
                                                            name={`payments.${index}.cash`}
                                                            type="text"
                                                            value={payment.cash}
                                                            onChange={(e) => {
                                                                updatePayment(
                                                                    index,
                                                                    "cash",
                                                                    e.target
                                                                        .value
                                                                );
                                                            }}
                                                            leading={
                                                                <BiDollar />
                                                            }
                                                            error={
                                                                errors[
                                                                    `payments.${index}.cash`
                                                                ]
                                                            }
                                                        />
                                                        <InlineInput
                                                            label="Transferencia"
                                                            name={`payments.${index}.transfer`}
                                                            type="text"
                                                            value={
                                                                payment.transfer
                                                            }
                                                            onChange={(e) => {
                                                                updatePayment(
                                                                    index,
                                                                    "transfer",
                                                                    e.target
                                                                        .value
                                                                );
                                                            }}
                                                            leading={
                                                                <BiDollar />
                                                            }
                                                            error={
                                                                errors[
                                                                    `payments.${index}.transfer`
                                                                ]
                                                            }
                                                        />
                                                        <InlineInput
                                                            label="TDC/TDD"
                                                            name={`payments.${index}.card`}
                                                            type="text"
                                                            value={payment.card}
                                                            onChange={(e) => {
                                                                updatePayment(
                                                                    index,
                                                                    "card",
                                                                    e.target
                                                                        .value
                                                                );
                                                            }}
                                                            leading={
                                                                <BiDollar />
                                                            }
                                                            error={
                                                                errors[
                                                                    `payments.${index}.card`
                                                                ]
                                                            }
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
                                                                dateFormat="dd/MM/yyyy"
                                                                className="w-[150px] h-8 px-2 text-sm bg-white rounded-input"
                                                                name={`payments.${index}.date`}
                                                                selected={
                                                                    payment.date
                                                                        ? new Date(
                                                                              payment.date +
                                                                                  "T00:00"
                                                                          )
                                                                        : new Date()
                                                                }
                                                                onChange={(
                                                                    value
                                                                ) => {
                                                                    if (!value)
                                                                        return;

                                                                    updatePayment(
                                                                        index,
                                                                        "date",
                                                                        format(
                                                                            value,
                                                                            "yyyy-MM-dd"
                                                                        )
                                                                    );
                                                                }}
                                                            />
                                                        </Flex>
                                                    </Fragment>
                                                );
                                            })}

                                        <LineDivider className="my-3" />
                                        <Flex justify="end">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                color="gray"
                                                onClick={addPayment}
                                            >
                                                <BiPlus />
                                                Agregar pago
                                            </Button>
                                        </Flex>

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
                branchId={branch.id}
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
