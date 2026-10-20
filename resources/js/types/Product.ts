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
    /** Precio 2 (mayoreo); null/0 = no tiene. */
    price2?: number | null;
    extra: number;
    /** true = el extra global de la sucursal no le aplica (usa su propio extra). */
    skip_global_extra?: boolean;
    created_at: string;
    updated_at: string;
    subtotal: number;
    stock?: Stock;
    /** Existencias en la sucursal pedida a /api/products/search (null = sin registro). */
    branch_stock?: number | string | null;
    /** null = el producto nunca se ha contado en esa sucursal ("sin inventario cargado"). */
    branch_counted_at?: string | null;
    stock_movements?: StockMovement[];
}
