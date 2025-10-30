export interface NoteItemInterface {
    id?: number;
    brand: string;
    model: string;
    measure: string;
    mc: string;
    unit: string;
    cost: number | string;
    price: number | string;
    iva: number | string;
    extra: number | string;
    quantity: number | string;
    purchase_subtotal: number;
    sale_subtotal: string | number;
    product_id?: number;
    delivery_status: string;
    supplied_status: string;
}
