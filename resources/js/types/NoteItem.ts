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
    /** Descuento de la partida en importe; sale_subtotal ya lo descuenta. */
    discount?: number | string;
    /** Precio de catálogo al momento de la venta. */
    list_price?: number | string | null;
}
