import { Flex, Grid, IconButton, Strong, Table, Text } from "@radix-ui/themes";
import InputWithLabel from "./InputWithLabel";
import { BiEdit, BiSave, BiTrash } from "react-icons/bi";
import { NoteItemInterface } from "@/types/NoteItem";
import { FaMagnifyingGlass } from "react-icons/fa6";
import { formatCurrency } from "@/helpers/formatters";
import {
    calculatePurchaseSubtotal,
    calculateSaleSubtotal,
} from "@/helpers/utils";
import { useState } from "react";
import InlineInput from "./InlineInput";

interface NoteItemProps {
    item: NoteItemInterface;
    index: number;
    onDelete: (id: number) => void;
    onOpenSearchModal: (position: number) => void;
    onUpdate: (index: number, item: NoteItemInterface) => void;
    isEdit: boolean;
}

const NoteItem = ({
    item,
    index,
    onDelete,
    onOpenSearchModal,
    onUpdate,
    isEdit,
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

    const [detailMode, setDetailMode] = useState(isEdit);

    if (detailMode) {
        return (
            <div>
                <Table.Root>
                    <Table.Header>
                        <Table.Row>
                            <Table.ColumnHeaderCell>
                                Producto
                            </Table.ColumnHeaderCell>

                            <Table.ColumnHeaderCell>
                                Cantidad
                            </Table.ColumnHeaderCell>

                            <Table.ColumnHeaderCell>
                                Precio
                            </Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell>
                                Costo
                            </Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell>
                                IVA (%)
                            </Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell>
                                Extra (%)
                            </Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell>
                                Subtotal compra
                            </Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell>
                                Subtotal venta
                            </Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell></Table.ColumnHeaderCell>
                        </Table.Row>
                    </Table.Header>
                    <Table.Body>
                        <Table.Row>
                            <Table.Cell>
                                {[
                                    item.model,
                                    item.type,
                                    item.brand,
                                    item.measure,
                                    item.unit,
                                    item.mc,
                                ]
                                    .filter(Boolean)
                                    .join(" - ")}
                            </Table.Cell>

                            <Table.Cell>{item.quantity}</Table.Cell>
                            <Table.Cell>
                                {formatCurrency(Number(item.price))}
                            </Table.Cell>
                            <Table.Cell>
                                {formatCurrency(Number(item.cost))}
                            </Table.Cell>
                            <Table.Cell>{item.iva}%</Table.Cell>
                            <Table.Cell>{item.extra}%</Table.Cell>
                            <Table.Cell>
                                {formatCurrency(Number(item.purchase_subtotal))}
                            </Table.Cell>
                            <Table.Cell>
                                {formatCurrency(Number(item.sale_subtotal))}
                            </Table.Cell>
                            <Table.Cell>
                                <Flex direction="column" gap="2">
                                    <IconButton
                                        type="button"
                                        color="yellow"
                                        onClick={() => setDetailMode(false)}
                                    >
                                        <BiEdit />
                                    </IconButton>
                                    <IconButton
                                        color="red"
                                        onClick={() => onDelete(index)}
                                        type="button"
                                    >
                                        <BiTrash />
                                    </IconButton>
                                </Flex>
                            </Table.Cell>
                        </Table.Row>
                    </Table.Body>
                </Table.Root>
            </div>
        );
    }

    return (
        <Grid columns="9">
            <Grid gridColumn="span 8">
                <Grid
                    columns="8"
                    gap="2"
                    className="px-2 py-4 border-b border-gray-200 bg-gray-50"
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
                    <Grid gridColumn="span 2">
                        <InputWithLabel
                            label="Código"
                            value={item.code}
                            name="code"
                            onChange={(e) => {
                                onUpdate(index, {
                                    ...item,
                                    code: e.target.value,
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
                            label="Tipo"
                            value={item.type}
                            name=""
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
                            label="Unidad"
                            value={item.unit}
                            name="unit"
                            onChange={(e) => {
                                onUpdate(index, {
                                    ...item,
                                    unit: e.target.value,
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

                    <Grid gridColumn="span 8" className="pt-2">
                        <div className="flex justify-end ">
                            <div className="flex flex-col gap-4 md:w-1/2 sm:w-full">
                                <InlineInput
                                    label="Cantidad: "
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
                                <div className="flex items-center justify-between">
                                    <Strong>Subtotal venta:</Strong>
                                    <Strong>
                                        {formatCurrency(item.sale_subtotal)}
                                    </Strong>
                                </div>
                                <div className="flex items-center justify-between">
                                    <Strong>Subtotal compra:</Strong>
                                    <Strong>
                                        {formatCurrency(item.purchase_subtotal)}
                                    </Strong>
                                </div>
                            </div>
                        </div>
                    </Grid>
                </Grid>
            </Grid>
            <Grid gridColumn="span 1">
                <div className="flex flex-col items-center justify-center gap-2">
                    <IconButton
                        type="button"
                        color="bronze"
                        onClick={() => onOpenSearchModal(index)}
                    >
                        <FaMagnifyingGlass color="white" />
                    </IconButton>
                    <IconButton
                        color="green"
                        onClick={() => setDetailMode(true)}
                        type="button"
                    >
                        <BiSave />
                    </IconButton>
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
