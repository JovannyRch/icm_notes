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

export const calculateSaleSubtotal = (product: NoteItemInterface): number => {
    return Number(product.price) * Number(product.quantity);
};

export const getPaymentMethods = (note: Note): string[] => {
    const result: string[] = [];
    if (note.cash > 0) {
        result.push(`Efect (${formatCurrency(note.cash)})`);
    }
    if (note.card > 0) {
        result.push(`Tarj (${formatCurrency(note.card)})`);
    }
    if (note.transfer > 0) {
        result.push(`Trans (${formatCurrency(note.transfer)})`);
    }

    return result;
};

export const isNumber = (value: any): boolean => {
    return !isNaN(Number(value));
};
