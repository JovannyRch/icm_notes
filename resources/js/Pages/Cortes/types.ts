interface PreviousNoteInput {
    folio: string;
    date: string;
    amount: string;
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
}
