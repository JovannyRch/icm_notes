import { Grid, IconButton, Strong, Text } from "@radix-ui/themes";
import InputWithLabel from "./InputWithLabel";
import { BiTrash } from "react-icons/bi";
import { NoteItemInterface } from "@/types/NoteItem";
import { FaMagnifyingGlass } from "react-icons/fa6";
import { formatCurrency } from "@/helpers/formatters";
import {
    calculatePurchaseSubtotal,
    calculateSaleSubtotal,
} from "@/helpers/utils";

interface NoteItemProps {
    item: NoteItemInterface;
    index: number;
    onDelete: (id: number) => void;
    onOpenSearchModal: (position: number) => void;
    onUpdate: (index: number, item: NoteItemInterface) => void;
}

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

    return (
        <Grid columns="9">
            <Grid gridColumn="span 8">
                <Grid
                    columns="8"
                    gap="2"
                    className="px-2 py-4 border-b border-gray-200 bg-gray-50"
                >
                    <Grid gridColumn="span 1">
                        <InputWithLabel
                            label="Código "
                            value={item.code ?? ""}
                            name="code"
                            onChange={(e) => {
                                onUpdate(index, {
                                    ...item,
                                    code: e.target.value,
                                });
                            }}
                        />
                    </Grid>
                    <Grid gridColumn="span 6">
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
                    <Grid gridColumn="span 1">
                        <div className="flex items-center justify-center h-full">
                            <IconButton
                                type="button"
                                color="bronze"
                                onClick={() => onOpenSearchModal(index)}
                            >
                                <FaMagnifyingGlass color="white" />
                            </IconButton>
                        </div>
                    </Grid>
                    <Grid gridColumn="span 2">
                        <InputWithLabel
                            label="Tipo"
                            value={item.type}
                            name=""
                        />
                    </Grid>
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
                        <InputWithLabel
                            label="Precio de venta"
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
                            value={item.commission}
                            name="commission"
                            onChange={(e) => {
                                const product = {
                                    ...item,
                                    commission: e.target.value,
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
                    <Grid gridColumn="span 2"></Grid>

                    <Grid gridColumn="span 4" className="pt-2">
                        <div className="flex items-center justify-between">
                            <Strong>Subtotal:</Strong>
                            <Strong>
                                {formatCurrency(item.purchase_subtotal)}
                            </Strong>
                        </div>
                    </Grid>
                </Grid>
            </Grid>
            <Grid gridColumn="span 1">
                <div className="flex items-center justify-center">
                    <IconButton
                        color="red"
                        onClick={() => onDelete(index)}
                        type="button"
                    >
                        <BiTrash />
                    </IconButton>
                </div>
            </Grid>
        </Grid>
    );
};

export default NoteItem;
