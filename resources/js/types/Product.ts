export interface Product {
    id: number;
    brand: string;
    model: string;
    measure: string;
    mc: string;
    unit: string;
    cost: number;
    iva: number;
    price: number;
    extra: number;
    created_at: string;
    updated_at: string;
    subtotal: number;
    stock?: Stock;
    stock_movements?: StockMovement[];
}
