export interface Product {
    id: number;
    code: string;
    type: string;
    brand: string;
    model: string;
    measure: string;
    description: string;
    mc: number;
    unit: string;
    cost: number;
    iva: number;
    price: number;
    extra: number;
    stock: number;
    created_at: string;
    updated_at: string;
    subtotal: number;
}
