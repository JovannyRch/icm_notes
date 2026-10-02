import { payment_status } from ".";
import { NotePayment } from "./NotePayment";

export interface Note {
    id?: number;
    folio: string;
    customer: string;
    customer_phone?: string | null;
    customer_address?: string | null;
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
    /** Descuento sobre el total (importe); sale_total ya es neto. */
    discount?: number | string;
    cash_received?: number | string | null;
    /** Código único del documento (QR del ticket). */
    code?: string | null;
    user_id?: number | null;
    // Agregados de todos los pagos (los recalcula el servidor).
    cash: number;
    card: number;
    transfer: number;
    payments?: NotePayment[];
    // Columnas legacy: sólo aparecen en snapshots de cortes guardados antes de N pagos.
    cash2?: number;
    card2?: number;
    transfer2?: number;
    second_payment_date?: string;
}
