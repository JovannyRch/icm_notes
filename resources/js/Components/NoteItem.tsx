import {
    Flex,
    Grid,
    IconButton,
    Strong,
    Table,
    Text,
    TextField,
} from "@radix-ui/themes";
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
import TextInput from "./TextInput";
import { SuppliedStatusSelect } from "./SuppliedStatusSelect";
import { DeliveryStatusSelect } from "./DeliveryStatusSelect";
import LineDivider from "./LineDivider";
import UnitInput from "./UnitInput";

interface NoteItemProps {
    item: NoteItemInterface;
    index: number;
    onDelete: (id: number) => void;
    onOpenSearchModal: (position: number) => void;
    onUpdate: (index: number, item: NoteItemInterface) => void;
    isEdit: boolean;
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

    const [detailMode, setDetailMode] = useState<boolean>(
        Boolean(isEdit && item?.id)
    );

    const isOdd = index % 2 === 0;

    if (detailMode) {
        return (
            <div
                className={`mb-6 rounded-md border border-gray-800 px-1 ${
                    isOdd ? "bg-gray-100" : ""
                }`}
            >
                <Table.Root>
                    <Table.Header>
                        <Table.Row>
                            <Table.ColumnHeaderCell className="text-left">
                                Producto
                            </Table.ColumnHeaderCell>

                            <Table.ColumnHeaderCell className="text-center">
                                Precio
                            </Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell className="text-center">
                                Costo
                            </Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell className="text-center">
                                IVA (%)
                            </Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell className="text-center">
                                Extra (%)
                            </Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell className="text-center">
                                Subtotal compra
                            </Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell className="text-center">
                                Subtotal venta
                            </Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell className="text-center">
                                Cantidad
                            </Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell></Table.ColumnHeaderCell>
                        </Table.Row>
                    </Table.Header>
                    <Table.Body>
                        <Table.Row>
                            <Table.Cell>
                                <div className="flex items-center w-full h-full font-bold">
                                    {[
                                        item.model,
                                        item.brand,
                                        item.measure,
                                        item.unit,
                                        item.mc,
                                    ]
                                        .filter(Boolean)
                                        .join(" - ")}
                                </div>
                            </Table.Cell>

                            <CenteredCell>
                                {formatCurrency(Number(item.price))}
                            </CenteredCell>
                            <CenteredCell>
                                {formatCurrency(Number(item.cost))}
                            </CenteredCell>
                            <CenteredCell>{item.iva}%</CenteredCell>
                            <CenteredCell>{item.extra}%</CenteredCell>
                            <CenteredCell>
                                {formatCurrency(Number(item.purchase_subtotal))}
                            </CenteredCell>
                            <CenteredCell>
                                {formatCurrency(Number(item.sale_subtotal))}
                            </CenteredCell>
                            <CenteredCell>
                                <div>
                                    <TextInput
                                        value={item.quantity}
                                        type="number"
                                        className="h-8 text-right md:w-3/4 sm:w-full"
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
                                </div>
                            </CenteredCell>
                            <CenteredCell>
                                <Flex direction="column" gap="2">
                                    <IconButton
                                        type="button"
                                        color="bronze"
                                        onClick={() => onOpenSearchModal(index)}
                                        className="hover:cursor-pointer"
                                    >
                                        <FaMagnifyingGlass color="white" />
                                    </IconButton>
                                    <IconButton
                                        type="button"
                                        color="yellow"
                                        onClick={() => setDetailMode(false)}
                                        className="hover:cursor-pointer"
                                    >
                                        <BiEdit />
                                    </IconButton>
                                    <IconButton
                                        color="red"
                                        onClick={() => onDelete(index)}
                                        type="button"
                                        className="hover:cursor-pointer"
                                    >
                                        <BiTrash />
                                    </IconButton>
                                </Flex>
                            </CenteredCell>
                        </Table.Row>
                    </Table.Body>
                </Table.Root>

                <Grid columns="2" gap="2" className="mt-4">
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
                </Grid>
                <LineDivider className="mt-8" />
            </div>
        );
    }

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
                                    label="m²"
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
                                            <Strong>Subtotal venta:</Strong>
                                            <Strong>
                                                {formatCurrency(
                                                    item.sale_subtotal
                                                )}
                                            </Strong>
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
                        <IconButton
                            color="green"
                            onClick={() => setDetailMode(true)}
                            type="button"
                            className="hover:cursor-pointer"
                        >
                            <BiSave />
                        </IconButton>
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
