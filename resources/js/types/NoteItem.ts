export interface NoteItemInterface {
    id?: number;
    code: string;
    type: string;
    brand: string;
    model: string;
    measure: string;
    description: string;
    caja_bulto: string;
    cost: number;
    iva: number;
    commission: number;
    stock: number;
    quantity: number;
    subtotal: number;
}
