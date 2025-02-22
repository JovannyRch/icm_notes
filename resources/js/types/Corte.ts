import { Note } from "./Note";

export interface Corte {
    id?: number;
    date: string;
    sale_total: number;
    notes_total: number;
    cash_total: number;
    card_total: number;
    transfer_total: number;
    previous_total: number;
    expenses_total: number;
    expenses: ExpenseInput[];
    notes: Note[];
    previous_notes: PreviousNoteInput[];
    branch_id: number;
    created_at: string;
    updated_at: string;
}
