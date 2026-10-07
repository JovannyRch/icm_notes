interface PreviousNoteInput {
    folio: string;
    date: string;
    card: string;
    /** credito | debito; null/ausente = sin especificar (y en las filas viejas). */
    card_type?: string | null;
    cash: string;
    transfer: string;
}

interface ExpenseInput {
    concept: string;
    amount: string;
}

interface CutSums {
    cardSum: number;
    /** Desglose de cardSum por tipo (lo que no tiene tipo queda fuera de los dos). */
    cardCreditSum: number;
    cardDebitSum: number;
    transferSum: number;
    cashSum: number;
    balanceSum: number;
    expensesSum: number;
    purchasesSum: number;
    total: number;
    previousNotesSum: number;
    notesSum: number;
    returnsSum: number;
}

interface ReturnInput {
    concept: string;
    amount: string;
}
