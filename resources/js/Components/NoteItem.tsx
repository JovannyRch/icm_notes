import { Grid, IconButton, Strong, Text } from "@radix-ui/themes";
import InputWithLabel from "./InputWithLabel";
import { BiTrash } from "react-icons/bi";
import { NoteItemInterface } from "@/types/NoteItem";
import { FaMagnifyingGlass } from "react-icons/fa6";
import { formatCurrency } from "@/helpers/formatters";

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
    const getSubtotal = (
        cost: number = item.cost,
        quantity: number = item.quantity,
        iva: number = item.iva,
        commission: number = item.commission
    ) => {
        return cost * quantity * (1 + iva / 100) * (1 + commission / 100);
    };

    return (
        <Grid columns="9">
            <Grid gridColumn="span 1">
                <div className="flex items-center">#{index + 1}</div>
            </Grid>
            <Grid gridColumn="span 7">
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
                            label="Descripción"
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
                            label="Caja/Bulto"
                            value={item.caja_bulto}
                            name="caja_bulto"
                            onChange={(e) => {
                                onUpdate(index, {
                                    ...item,
                                    caja_bulto: e.target.value,
                                });
                            }}
                        />
                    </Grid>
                    <Grid gridColumn="span 2">
                        <InputWithLabel
                            label="Costo unitario"
                            value={item.cost}
                            name="cost"
                            onChange={(e) => {
                                onUpdate(index, {
                                    ...item,
                                    cost: Number(e.target.value),
                                    subtotal: getSubtotal(
                                        Number(e.target.value ?? 0),
                                        Number(item.quantity ?? 0),
                                        Number(item.iva ?? 0),
                                        Number(item.commission ?? 0)
                                    ),
                                });
                            }}
                        />
                    </Grid>
                    <Grid gridColumn="span 2">
                        <InputWithLabel
                            label="Cantidad"
                            value={item.quantity}
                            name="quantity"
                            onChange={(e) => {
                                onUpdate(index, {
                                    ...item,
                                    quantity: Number(e.target.value),
                                    subtotal: getSubtotal(
                                        Number(item.cost ?? 0),
                                        Number(e.target.value ?? 0),
                                        Number(item.iva ?? 0),
                                        Number(item.commission ?? 0)
                                    ),
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
                                onUpdate(index, {
                                    ...item,
                                    iva: Number(e.target.value),
                                    subtotal: getSubtotal(
                                        Number(item.cost ?? 0),
                                        Number(item.quantity ?? 0),
                                        Number(e.target.value ?? 0),
                                        Number(item.commission ?? 0)
                                    ),
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
                                onUpdate(index, {
                                    ...item,
                                    commission: Number(e.target.value),
                                    subtotal: getSubtotal(
                                        Number(item.cost ?? 0),
                                        Number(item.quantity ?? 0),
                                        Number(item.iva ?? 0),
                                        Number(e.target.value ?? 0)
                                    ),
                                });
                            }}
                        />
                    </Grid>

                    <Grid gridColumn="span 5">
                        <InputWithLabel
                            label="Estatus de entrega"
                            value="No entregado"
                            name=""
                        />
                    </Grid>
                    <Grid gridColumn="span 3" className="pt-2">
                        <div className="flex items-center justify-between">
                            <Strong>Subtotal:</Strong>
                            <Strong>{formatCurrency(item.subtotal)}</Strong>
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
