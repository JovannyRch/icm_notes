import Container from "@/Components/Container";
import InputWithLabel from "@/Components/InputWithLabel";
import SectionCard from "@/Components/SectionCard";
import PageHeader from "@/Components/ui/PageHeader";
import Modal from "@/Components/Modal";
import Pagination from "@/Components/Pagination";
import UnitInput from "@/Components/UnitInput";
import { effectiveExtra, isNumber, showsStock } from "@/helpers/utils";
import { formatCurrency } from "@/helpers/formatters";
import useAlerts from "@/hooks/useAlerts";
import { useBranch } from "@/hooks/useBranch";
import { PageProps } from "@/types";
import { Product } from "@/types/Product";
import { Link, router, useForm } from "@inertiajs/react";
import { Badge, Button, Flex, Tabs, Text } from "@radix-ui/themes";
import { useState } from "react";
import { confirmAlert } from "react-confirm-alert";
import { BiArrowBack, BiArrowToRight, BiSave, BiTrash } from "react-icons/bi";
import { BiDownArrowAlt, BiUpArrowAlt, BiTransfer } from "react-icons/bi";
import { MdOutlineEdit } from "react-icons/md";
import { BiPlus } from "react-icons/bi";
import StockMovementForm from "./components/StockMovementForm";
import { useUpdateEffect } from "@/hooks/useUpdateEffect";
import { useBranchExtra } from "@/hooks/useBranchExtra";

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

const movementLabels: Record<string, { label: string; color: "green" | "red" | "blue" | "orange" | "purple" }> = {
    IN: { label: "Entrada", color: "green" },
    OUT: { label: "Salida", color: "red" },
    TRANSFER_IN: { label: "Traspaso entrada", color: "blue" },
    TRANSFER_OUT: { label: "Traspaso salida", color: "orange" },
    ADJUSTMENT: { label: "Ajuste", color: "purple" },
};

const Form = ({
    product,
    stockMovements: stockMovementsWithPagination = [],
    flash,
}: FormProps) => {
    const isEdit = !!product;
    const stockMovements: StockMovement[] = stockMovementsWithPagination?.data ?? [];
    const [showMovementModal, setShowMovementModal] = useState(false);

    useAlerts(flash);

    const { currentBranchName } = useBranch();
    const { globalExtra } = useBranchExtra();

    const { data, setData, errors, put, post, processing, transform } = useForm({
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
                : ""
        ),
    });

    const originalStock = isNumber(product?.stock?.quantity) ? Number(product?.stock?.quantity) : null;
    // Nunca contado en la sucursal: las ventas pudieron moverlo, pero no hay inventario cargado.
    // Se muestra el número si ya se contó o si ya se movió (vender sin inventario descuenta desde 0).
    const isCounted = showsStock(product?.stock?.quantity, product?.stock?.counted_at);
    // isNumber("") es true (Number("") === 0): un campo vacío no es un número capturado.
    const isFilledNumber = (value: string) => value.trim() !== "" && isNumber(value);

    const submit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        // Existencias sólo se envía si es un número y cambió: el backend registra un
        // ajuste de inventario cada vez que llega, y "-" (sin existencias) no valida.
        transform((form) => {
            const { stock, ...rest } = form;
            const stockChanged = isFilledNumber(stock) && Number(stock) !== originalStock;
            return stockChanged ? { ...rest, stock } : rest;
        });
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

    // Vista previa del costo real, igual que calculatePurchaseSubtotal() con cantidad 1.
    const appliedExtra = effectiveExtra(Number(data.extra) || 0, globalExtra);
    const costWithTaxes = (Number(data.cost) || 0) * (1 + (Number(data.iva) || 0) / 100) * (1 + appliedExtra / 100);
    const unitProfit = (Number(data.price) || 0) - costWithTaxes;
    const stockChanged = isEdit && isFilledNumber(data.stock) && Number(data.stock) !== originalStock;

    const handleOnDelete = () => {
        confirmAlert({
            title: "Eliminar producto",
            message: "¿Estás seguro de eliminar este producto?",
            buttons: [
                {
                    label: "Sí",
                    onClick: () => {
                        router.delete(route("products.destroy", product!.id));
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
                        : ""
                )
            );
        }
    }, [product?.stock?.quantity]);

    const field = (name: keyof typeof data, label: string, opts: { required?: boolean; type?: "text" | "number"; className?: string } = {}) => (
        <InputWithLabel
            label={opts.required ? `${label} *` : label}
            name={name}
            type={opts.type ?? "text"}
            value={data[name]}
            onChange={(e) => setData(name, e.target.value)}
            error={errors[name]}
            className={opts.className}
        />
    );

    const productName = isEdit ? `${product!.brand} ${product!.model}`.trim() : "Nuevo producto";

    return (
        <Container headTitle={isEdit ? "Editar producto" : "Nuevo producto"}>
            <div>
                <PageHeader
                    back={{ label: "Lista de productos", href: route("products") }}
                    title={productName}
                    description={
                        isEdit ? (
                            <>
                                {[product!.measure, product!.unit].filter(Boolean).join(" · ") || "Sin medida"}
                                {" · "}Existencias en {currentBranchName}:{" "}
                                {isCounted ? <b className="text-charcoal">{originalStock}</b> : <span className="text-fog">sin inventario</span>}
                            </>
                        ) : undefined
                    }
                    actions={
                        isEdit ? (
                            <Button color="red" variant="soft" onClick={handleOnDelete}>
                                <BiTrash />
                                Eliminar
                            </Button>
                        ) : undefined
                    }
                />

                <Tabs.Root defaultValue={checkCurrentTab()} orientation="horizontal">
                    <Tabs.List>
                        <Tabs.Trigger
                            value="data"
                            onClick={() => {
                                const url = new URL(window.location.href);
                                url.searchParams.delete("tab");
                                window.history.pushState({}, "", url);
                            }}
                        >
                            Datos del producto
                        </Tabs.Trigger>
                        {isEdit && (
                            <Tabs.Trigger
                                value="movements"
                                onClick={() => {
                                    const url = new URL(window.location.href);
                                    url.searchParams.set("tab", "movements");
                                    window.history.pushState({}, "", url);
                                }}
                            >
                                Movimientos de inventario
                            </Tabs.Trigger>
                        )}
                    </Tabs.List>

                    <Tabs.Content value="data">
                        <form onSubmit={submit} className="mt-5 space-y-4">
                            <SectionCard title="Identificación" subtitle="* Campos obligatorios">
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-6">
                                    {field("brand", "Marca", { required: true, className: "md:col-span-2" })}
                                    {field("model", "Modelo", { required: true, className: "md:col-span-4" })}
                                    {field("measure", "Medida", { className: "md:col-span-2" })}
                                    {field("mc", "MC", { className: "md:col-span-2" })}
                                    <div className="md:col-span-2">
                                        <UnitInput value={data.unit} onChange={(value) => setData("unit", value)} />
                                    </div>
                                </div>
                            </SectionCard>

                            <SectionCard title="Precio y costo">
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                                    {field("price", "Precio público ($)")}
                                    {field("cost", "Costo ($)")}
                                    {field("iva", "IVA (%)")}
                                    <div>
                                        {field("extra", "Extra (%)")}
                                        {globalExtra !== null && (
                                            <p className="mt-1 text-xs text-violet-700">
                                                {currentBranchName} usa un extra global de {globalExtra}%; este valor no se aplica ahí.
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 gap-3 p-3 mt-4 text-sm rounded-card sm:grid-cols-2 bg-paper">
                                    <div>
                                        <div className="text-xs text-fog">
                                            Costo con IVA y extra ({appliedExtra}%{globalExtra !== null ? " global" : ""})
                                        </div>
                                        <div className="font-semibold tabular-nums">{formatCurrency(costWithTaxes)}</div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-fog">Utilidad por unidad</div>
                                        <div className={`font-semibold tabular-nums ${unitProfit < 0 ? "text-[#d03b3b]" : "text-vivid-green"}`}>
                                            {formatCurrency(unitProfit)}
                                        </div>
                                    </div>
                                </div>
                            </SectionCard>

                            <SectionCard title="Inventario" subtitle={`Sucursal ${currentBranchName}`}>
                                <div className="max-w-xs">
                                    {field("stock", "Existencias")}
                                    <p className={`mt-1 text-xs ${stockChanged ? "text-amber-700" : "text-fog"}`}>
                                        {isEdit
                                            ? stockChanged
                                                ? `Se registrará un ajuste de ${originalStock ?? "-"} a ${data.stock}.`
                                                : isCounted
                                                  ? "Si lo cambias se registra un ajuste de inventario."
                                                  : "Aún sin inventario cargado en esta sucursal. Captura el conteo físico para empezar a llevarlo."
                                            : "Opcional. Déjalo vacío si aún no hay existencias."}
                                    </p>
                                </div>
                            </SectionCard>

                            <div className="flex justify-end">
                                <Button type="submit" size="3" disabled={processing}>
                                    <BiSave />
                                    {processing ? "Guardando..." : isEdit ? "Guardar cambios" : "Guardar producto"}
                                </Button>
                            </div>
                        </form>
                    </Tabs.Content>

                    <Tabs.Content value="movements">
                        <SectionCard
                            className="mt-5"
                            title={`Movimientos en ${currentBranchName}`}
                            subtitle={isCounted ? `Existencias actuales: ${originalStock}` : "Aún sin inventario cargado en esta sucursal"}
                            actions={
                                <Button onClick={() => setShowMovementModal(true)}>
                                    <BiPlus className="w-5 h-5" />
                                    Nuevo movimiento
                                </Button>
                            }
                        >
                            {stockMovements.length === 0 ? (
                                <p className="py-8 text-sm text-center text-fog">
                                    No hay movimientos de inventario para este producto.
                                </p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="text-xs text-left text-fog uppercase border-b border-ash">
                                                <th className="py-2 pr-3 font-medium">Fecha</th>
                                                <th className="py-2 pr-3 font-medium">Sucursal</th>
                                                <th className="py-2 pr-3 font-medium">Tipo</th>
                                                <th className="py-2 pr-3 font-medium text-right">Cantidad</th>
                                                <th className="py-2 font-medium">Descripción</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {stockMovements.map((m) => {
                                                const type = movementLabels[m.movement_type] ?? { label: m.movement_type, color: "gray" as const };
                                                return (
                                                    <tr key={m.id} className="border-b border-ash">
                                                        <td className="py-2 pr-3 whitespace-nowrap">{new Date(m.created_at).toLocaleString("es-MX")}</td>
                                                        <td className="py-2 pr-3">{m.branch?.name ?? "-"}</td>
                                                        <td className="py-2 pr-3 whitespace-nowrap">
                                                            <Badge color={type.color} variant="soft">
                                                                {type.label}
                                                                {movementIcons[m.movement_type as keyof typeof movementIcons]}
                                                            </Badge>
                                                        </td>
                                                        <td className="py-2 pr-3 font-medium text-right tabular-nums">
                                                            {isNumber(m.quantity) ? Number(m.quantity) : "-"}
                                                        </td>
                                                        <td className="py-2">
                                                            {m.description ?? "-"}
                                                            {m.note_id && (
                                                                <a
                                                                    href={route("notes.show", m.note_id)}
                                                                    target="_blank"
                                                                    className="inline-flex items-center gap-1 ml-2 font-medium text-electric hover:underline"
                                                                >
                                                                    Ver nota
                                                                    <BiArrowToRight className="w-4 h-4" />
                                                                </a>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                            <Pagination pagination={stockMovementsWithPagination} />
                        </SectionCard>
                    </Tabs.Content>
                </Tabs.Root>

                <Modal show={showMovementModal} onClose={() => setShowMovementModal(false)} maxWidth="lg">
                    {product && <StockMovementForm product={product} onClose={() => setShowMovementModal(false)} />}
                </Modal>
            </div>
        </Container>
    );
};

export default Form;
