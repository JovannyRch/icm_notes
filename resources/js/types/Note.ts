import { payment_status } from ".";

export interface Note {
    id?: number;
    folio: string;
    customer: string;
    date: string;
    advance: number;
    flete: number;
    balance: number;
    status: payment_status;
    purchase_status: payment_status;
    delivery_status: string;
    notes: string;
    branch_id: number;
    created_at: string;
    updated_at: string;
    archived: boolean;
    payment_method: string;
    sale_total: number;
    purchase_total: number;
    cash: number;
    card: number;
    transfer: number;
    cash2: number;
    card2: number;
    transfer2: number;
    second_payment_date: string;
}
