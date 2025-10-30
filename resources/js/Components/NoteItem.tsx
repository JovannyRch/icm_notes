import { Grid, IconButton, Strong, Table } from "@radix-ui/themes";
import InputWithLabel from "./InputWithLabel";
import { BiTrash } from "react-icons/bi";
import { NoteItemInterface } from "@/types/NoteItem";
import { FaMagnifyingGlass } from "react-icons/fa6";
import { formatCurrency } from "@/helpers/formatters";
import {
    calculatePurchaseSubtotal,
    calculateSaleSubtotal,
} from "@/helpers/utils";
import InlineInput from "./InlineInput";
import { SuppliedStatusSelect } from "./SuppliedStatusSelect";
import { DeliveryStatusSelect } from "./DeliveryStatusSelect";
import UnitInput from "./UnitInput";

interface NoteItemProps {
    item: NoteItemInterface;
    index: number;
    onDelete: (id: number) => void;
    onOpenSearchModal: (position: number) => void;
    onUpdate: (index: number, item: NoteItemInterface) => void;
    isEdit: boolean;
    updateCalculatedValues?: (item: NoteItemInterface) => void;
}

const CenteredCell = ({ children }: { children: React.ReactNode }) => (
    <Table.Cell className="text-center">
        <div className="flex items-center justify-center w-full h-full">
            {children}
        </div>
    </Table.Cell>
);

const NoteItem = ({
    item,
    index,
    onDelete,
    onOpenSearchModal,
    onUpdate,
}: NoteItemProps) => {
    const calculateSubtotals = (
        product: NoteItemInterface
    ): {
        purchase_subtotal: number;
        sale_subtotal: number;
    } => {
        return {
            purchase_subtotal: calculatePurchaseSubtotal(product),
            sale_subtotal: calculateSaleSubtotal(product),
        };
    };

    const isOdd = index % 2 === 0;

    return (
        <Grid
            columns="9"
            className={`rounded-md px-1 border border-gray-800  mb-6 ${
                isOdd ? "bg-gray-100" : " "
            }`}
        >
            <Grid gridColumn="span 9">
                <div className="flex ">
                    <div className="flex-1">
                        <Grid
                            columns="8"
                            gap="2"
                            className="px-2 py-4 border-b border-gray-200 "
                        >
                            <Grid gridColumn="span 2">
                                <InputWithLabel
                                    label="Marca"
                                    value={item.brand}
                                    name="brand"
                                    onChange={(e) => {
                                        onUpdate(index, {
                                            ...item,
                                            brand: e.target.value,
                                        });
                                    }}
                                />
                            </Grid>

                            <Grid gridColumn="span 4">
                                <InputWithLabel
                                    label="Modelo"
                                    value={item.model}
                                    name="model"
                                    onChange={(e) => {
                                        onUpdate(index, {
                                            ...item,
                                            model: e.target.value,
                                        });
                                    }}
                                />
                            </Grid>

                            <Grid gridColumn="span 2">
                                <InputWithLabel
                                    label="Cantidad"
                                    value={item.quantity}
                                    type="number"
                                    name="quantity"
                                    onChange={(e) => {
                                        const product = {
                                            ...item,
                                            quantity: e.target.value,
                                        };
                                        onUpdate(index, {
                                            ...product,
                                            ...calculateSubtotals(product),
                                        });
                                    }}
                                />
                            </Grid>
                            <Grid gridColumn="span 2">
                                <InputWithLabel
                                    label="Medida"
                                    value={item.measure}
                                    name="measure"
                                    onChange={(e) => {
                                        onUpdate(index, {
                                            ...item,
                                            measure: e.target.value,
                                        });
                                    }}
                                />
                            </Grid>
                            <Grid gridColumn="span 2">
                                <InputWithLabel
                                    label="MC"
                                    value={item.mc}
                                    name="mc"
                                    onChange={(e) => {
                                        onUpdate(index, {
                                            ...item,
                                            mc: e.target.value,
                                        });
                                    }}
                                />
                            </Grid>
                            <Grid gridColumn="span 2">
                                <UnitInput
                                    value={item.unit}
                                    onChange={(value: string) =>
                                        onUpdate(index, {
                                            ...item,
                                            unit: value,
                                        })
                                    }
                                />
                            </Grid>
                            <Grid gridColumn="span 2">
                                <InputWithLabel
                                    label="Precio público"
                                    leading="$"
                                    value={item.price}
                                    name="cost"
                                    onChange={(e) => {
                                        const product = {
                                            ...item,
                                            price: e.target.value,
                                        };
                                        onUpdate(index, {
                                            ...product,
                                            ...calculateSubtotals(product),
                                        });
                                    }}
                                />
                            </Grid>
                            <Grid gridColumn="span 2">
                                <InputWithLabel
                                    label="Costo"
                                    value={item.cost}
                                    name="cost"
                                    leading="$"
                                    onChange={(e) => {
                                        const product = {
                                            ...item,
                                            cost: e.target.value,
                                        };
                                        onUpdate(index, {
                                            ...product,
                                            ...calculateSubtotals(product),
                                        });
                                    }}
                                />
                            </Grid>

                            <Grid gridColumn="span 2">
                                <InputWithLabel
                                    label="IVA (%)"
                                    name="iva"
                                    value={String(item.iva) ?? ""}
                                    onChange={(e) => {
                                        const product = {
                                            ...item,
                                            iva: e.target.value,
                                        };
                                        onUpdate(index, {
                                            ...product,
                                            ...calculateSubtotals(product),
                                        });
                                    }}
                                />
                            </Grid>
                            <Grid gridColumn="span 2">
                                <InputWithLabel
                                    label="Extra (%)"
                                    value={item.extra}
                                    name="extra"
                                    onChange={(e) => {
                                        const product = {
                                            ...item,
                                            extra: e.target.value,
                                        };
                                        onUpdate(index, {
                                            ...product,
                                            ...calculateSubtotals(product),
                                        });
                                    }}
                                />
                            </Grid>

                            <Grid gridColumn="span 5" className="pt-2">
                                <Grid columns="2" justify="between" gap="2">
                                    <Grid>
                                        <SuppliedStatusSelect
                                            value={item.supplied_status}
                                            onChange={(value) => {
                                                onUpdate(index, {
                                                    ...item,
                                                    supplied_status: value,
                                                });
                                            }}
                                        />
                                    </Grid>
                                    <Grid>
                                        <DeliveryStatusSelect
                                            value={item.delivery_status}
                                            onChange={(value) => {
                                                onUpdate(index, {
                                                    ...item,
                                                    delivery_status: value,
                                                });
                                            }}
                                        />
                                    </Grid>
                                </Grid>
                            </Grid>
                            <Grid gridColumn="span 3" className="pt-2">
                                <div className="flex justify-end ">
                                    <div className="flex flex-col gap-4">
                                        <div className="flex items-center justify-between">
                                            <InlineInput
                                                name="subtotal_venta"
                                                value={item.sale_subtotal}
                                                label="Subtotal venta"
                                                onChange={(e) => {
                                                    const newSubtotal = Number(
                                                        e.target.value
                                                    );
                                                    onUpdate(index, {
                                                        ...item,
                                                        price: (
                                                            Number(
                                                                newSubtotal
                                                            ) /
                                                            (Number(
                                                                item.quantity
                                                            ) || 1.0)
                                                        ).toFixed(2),
                                                        sale_subtotal:
                                                            newSubtotal,
                                                    });
                                                }}
                                            />
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <Strong>Subtotal compra:</Strong>
                                            <Strong>
                                                {formatCurrency(
                                                    item.purchase_subtotal
                                                )}
                                            </Strong>
                                        </div>
                                    </div>
                                </div>
                            </Grid>
                        </Grid>
                    </div>
                    <div className="flex flex-col items-center justify-center gap-2 min-w-[56px]">
                        <IconButton
                            type="button"
                            color="bronze"
                            onClick={() => onOpenSearchModal(index)}
                            className="hover:cursor-pointer"
                        >
                            <FaMagnifyingGlass color="white" />
                        </IconButton>
                        {/*  <IconButton
                            color="green"
                            onClick={() => setDetailMode(true)}
                            type="button"
                            className="hover:cursor-pointer"
                        >
                            <BiSave />
                        </IconButton> */}
                        <IconButton
                            color="red"
                            onClick={() => onDelete(index)}
                            type="button"
                            className="hover:cursor-pointer"
                        >
                            <BiTrash />
                        </IconButton>
                    </div>
                </div>
            </Grid>
        </Grid>
    );
};

export default NoteItem;
