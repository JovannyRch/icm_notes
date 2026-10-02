import { Note } from "@/types/Note";
import { NoteItemInterface } from "@/types/NoteItem";
import { formatCurrency } from "./formatters";

export const calculatePurchaseSubtotal = (
    product: NoteItemInterface
): number => {
    return (
        Number(product.cost) *
        Number(product.quantity) *
        (1 + Number(product.iva) / 100) *
        (1 + Number(product.extra) / 100)
    );
};

/** El extra global de la sucursal, si existe, reemplaza al del producto. */
export const effectiveExtra = (
    productExtra: number | null | undefined,
    globalExtra: number | null
): number => globalExtra ?? Number(productExtra ?? 0);

/** Subtotal de venta NETO de la partida: precio × cantidad − descuento (0 en notas sin descuento). */
export const calculateSaleSubtotal = (product: NoteItemInterface): number => {
    return Number(product.price) * Number(product.quantity) - Number(product.discount ?? 0);
};

export const getPaymentMethods = (note: Note): string[] => {
    const result: string[] = [];

    if (note.cash > 0) {
        result.push(`Efect (${formatCurrency(note.cash)})`);
    }

    if (note.transfer > 0) {
        result.push(`Trans (${formatCurrency(note.transfer)})`);
    }
    if (note.card > 0) {
        result.push(`Tarj (${formatCurrency(note.card)})`);
    }

    return result;
};

export const isNumber = (value: any): boolean => {
    return !isNaN(Number(value));
};

export const numberMonthToString = (monthStr: string): string => {
    const month = Number(monthStr);
    switch (month) {
        case 1:
            return "Enero";
        case 2:
            return "Febrero";
        case 3:
            return "Marzo";
        case 4:
            return "Abril";
        case 5:
            return "Mayo";
        case 6:
            return "Junio";
        case 7:
            return "Julio";
        case 8:
            return "Agosto";
        case 9:
            return "Septiembre";
        case 10:
            return "Octubre";
        case 11:
            return "Noviembre";
        case 12:
            return "Diciembre";
        default:
            return "";
    }
};

export const textWithEllipsis = (name: string, maxLength: number = 20) => {
    if (!name) return "";
    if (name.length <= maxLength) return name;
    return name.slice(0, maxLength - 3) + "...";
};
