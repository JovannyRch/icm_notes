interface Stock {
    /** null = nunca contado en esa sucursal ("sin inventario cargado"). */
    counted_at?: string | null;
    id?: number;
    product_id: number;
    quantity: number;
    created_at?: string;
    updated_at?: string;
}
