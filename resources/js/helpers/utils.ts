import { NoteItemInterface } from "@/types/NoteItem";

export const calculatePurchaseSubtotal = (
    product: NoteItemInterface
): number => {
    return (
        Number(product.cost) *
        Number(product.quantity) *
        (1 + Number(product.iva) / 100) *
        (1 + Number(product.commission) / 100)
    );
};

export const calculateSaleSubtotal = (product: NoteItemInterface): number => {
    return Number(product.price) * Number(product.quantity);
};
