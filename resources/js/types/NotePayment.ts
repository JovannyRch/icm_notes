export interface NotePayment {
    id?: number;
    note_id?: number;
    branch_id?: number;
    date: string;
    cash: number | string;
    card: number | string;
    /** credito | debito | null (sin especificar). */
    card_type?: string | null;
    transfer: number | string;
    position?: number;
    description?: string | null;
}

/** Fila de pago tal como la maneja el formulario (todo string, como el resto del form). */
export interface PaymentInput {
    id?: number;
    date: string;
    cash: string;
    card: string;
    card_type?: string | null;
    transfer: string;
}
