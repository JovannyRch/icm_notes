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
    /** Existencias en la sucursal pedida a /api/products/search (null = sin registro). */
    branch_stock?: number | string | null;
    stock_movements?: StockMovement[];
}
