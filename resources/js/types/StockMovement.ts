interface StockMovement {
    id: number;
    branch_id: number;
    product_id: number;
    movement_type: string;
    quantity: string;
    note_id: number | null;
    description: string;
    created_at: string;
    updated_at: string;
    branch?: Branch;
}
