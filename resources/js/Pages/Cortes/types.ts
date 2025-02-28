interface PreviousNoteInput {
    folio: string;
    date: string;
    card: string;
    cash: string;
    transfer: string;
}

interface ExpenseInput {
    concept: string;
    amount: string;
}

interface CutSums {
    cardSum: number;
    transferSum: number;
    cashSum: number;
    balanceSum: number;
    expensesSum: number;
    total: number;
    previousNotesSum: number;
    notesSum: number;
    returnsSum: number;
}

interface ReturnInput {
    concept: string;
    amount: string;
}
