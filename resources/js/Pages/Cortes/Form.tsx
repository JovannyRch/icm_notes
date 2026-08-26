import Container from "@/Components/Container";
import { useUpdateEffect } from "@/hooks/useUpdateEffect";
import { PageProps } from "@/types";

import { Note } from "@/types/Note";
import { Button, Flex, IconButton, Text } from "@radix-ui/themes";
import { format } from "date-fns";
import { useEffect, useState } from "react";
import { BiArrowBack, BiRefresh, BiSave, BiTrash } from "react-icons/bi";
import NotesTable from "./components/NotesTable";
import PendingNotesTable from "./components/PendingNotesTable";
import AmountDetailsTable from "./components/AmountDetailsTable";
import ExpensesTable from "./components/ExpensesTable";
import { isNumber } from "@/helpers/utils";
import { Corte } from "@/types/Corte";
import { Inertia } from "@inertiajs/inertia";
import useAlerts from "@/hooks/useAlerts";
import { confirmAlert } from "react-confirm-alert";
import ReturnsTable from "./components/ReturnsTable";
import { router } from "@inertiajs/react";
import { FaDownload } from "react-icons/fa6";
import { CgAdd } from "react-icons/cg";
import axios from "axios";

interface Props extends PageProps {
    notes: Note[];
    previous_payments?: PreviousNoteInput[];
    cashSum: number;
    total: number;
    transferSum: number;
    cardSum: number;
    balanceSum: number;
    branch: Branch;
    corte?: Corte;
    date: string;
}

const cleanNotes = (notes: Note[]) => {
    return notes.filter((note) => note?.delivery_status !== "cancelado" && note?.status !== "canceled");
};

const Spacer = () => <div className="h-[60px]"></div>;

/**
 * Importes que una nota aportó al corte de `date`: sólo los pagos hechos ese día.
 *
 * Un corte ya guardado no trae `payments` (su snapshot conserva los importes del
 * día consolidados en cash/card/transfer), así que ahí se usan tal cual.
 */
export const paymentsOnDate = (note: Note, date: string) => {
    if (!note.payments) {
        return {
            cash: Number(note.cash ?? 0),
            card: Number(note.card ?? 0),
            transfer: Number(note.transfer ?? 0),
        };
    }

    return note.payments
        .filter((payment) => payment.date === date)
        .reduce(
            (acc, payment) => ({
                cash: acc.cash + Number(payment.cash ?? 0),
                card: acc.card + Number(payment.card ?? 0),
                transfer: acc.transfer + Number(payment.transfer ?? 0),
            }),
            { cash: 0, card: 0, transfer: 0 }
        );
};

function calculateSums(
    notes: Note[],
    expenses: ExpenseInput[],
    previousNotes: PreviousNoteInput[],
    returns: ReturnInput[],
    date: string
): CutSums {
    let cardSum = 0;
    let transferSum = 0;
    let cashSum = 0;
    let balanceSum = 0;
    let total = 0;
    let notesSum = 0;
    let purchasesSum = 0;

    cleanNotes(notes).forEach((note) => {
        const paid = paymentsOnDate(note, date);

        cardSum += paid.card;
        transferSum += paid.transfer;
        cashSum += paid.cash;
        balanceSum += Number(note.balance ?? 0);
        total += Number(note.sale_total ?? 0);
        notesSum += Number(note.sale_total ?? 0);
        purchasesSum += Number(note?.purchase_total ?? 0);
    });

    const expensesSum = expenses.reduce((acc, expense) => {
        return acc + (isNumber(expense.amount) ? Number(expense.amount) : 0);
    }, 0);

    let previousNotesCashSum = 0;
    let previousNotesTransferSum = 0;
    let previousNotesCardSum = 0;

    previousNotes.forEach((note) => {
        const cash = Number(note.cash ?? 0);
        const transfer = Number(note.transfer ?? 0);
        const card = Number(note.card ?? 0);

        previousNotesCashSum += cash;
        previousNotesTransferSum += transfer;
        previousNotesCardSum += card;
    });

    cashSum += previousNotesCashSum;
    transferSum += previousNotesTransferSum;
    cardSum += previousNotesCardSum;

    const returnsSum = returns.reduce((acc, note) => {
        return acc + (isNumber(note.amount) ? Number(note.amount) : 0);
    }, 0);

    cashSum = cashSum - expensesSum - returnsSum;

    return {
        cardSum,
        transferSum,
        cashSum,
        balanceSum,
        total,
        expensesSum,
        previousNotesSum:
            previousNotesCashSum +
            previousNotesTransferSum +
            previousNotesCardSum,
        notesSum,
        returnsSum,
        purchasesSum: purchasesSum,
    };
}

const emptyPreviousNote: PreviousNoteInput = {
    folio: "",
    date: "",
    cash: "",
    card: "",
    transfer: "",
};

const CorteForm = ({
    notes: initialNotes,
    previous_payments: initialPreviousPayments = [],
    branch,
    corte,
    flash,
    date,
}: Props) => {
    const isDetail = !!corte;

    useAlerts(flash);

    const [notes, setNotes] = useState<Note[]>(
        isDetail ? corte.notes : initialNotes
    );

    const [sums, setSums] = useState<CutSums>({
        notesSum: 0,
        cardSum: 0,
        transferSum: 0,
        cashSum: 0,
        balanceSum: 0,
        expensesSum: 0,
        purchasesSum: 0,
        previousNotesSum: 0,
        returnsSum: 0,
        total: 0,
    });

    const {
        cashSum,
        transferSum,
        cardSum,
        balanceSum,
        total,
        notesSum,
        expensesSum,
        previousNotesSum,
    } = sums;

    // "Entradas anteriores" ya no se captura a mano: son los pagos de hoy sobre
    // notas de días anteriores. La última fila queda vacía porque handleSubmit
    // descarta la última (es la plantilla de captura de DynamicTable).
    const [previousNotes, setPreviousNotes] = useState<PreviousNoteInput[]>(
        isDetail
            ? corte.previous_notes
            : [...initialPreviousPayments, emptyPreviousNote]
    );

    const [returns, setReturns] = useState<ReturnInput[]>(
        isDetail
            ? corte?.returns ?? []
            : [
                  {
                      concept: "",
                      amount: "",
                  },
              ]
    );

    const [expenses, setExpenses] = useState<ExpenseInput[]>(
        isDetail
            ? corte.expenses
            : [
                  {
                      concept: "",
                      amount: "",
                  },
              ]
    );

    const handleSubmit = () => {
        Inertia.post(route("cortes.store"), {
            date: date,
            sale_total: total,
            notes_total: notesSum,
            card_total: cardSum,
            transfer_total: transferSum,
            cash_total: cashSum,
            previous_notes_total: previousNotesSum,
            expenses_total: expensesSum,

            // El snapshot conserva su forma histórica (cash/card/transfer por nota)
            // para que el PDF, los Excel y el corte semanal no cambien: lo que
            // cambia es que ahora son los pagos de ESTE día, no los de la nota.
            notes: JSON.stringify(
                notes.map((note) => {
                    const paid = paymentsOnDate(note, date);

                    return {
                        id: note.id,
                        folio: note.folio,
                        date: note.date,
                        advance: note.advance,
                        balance: note.balance,
                        sale_total: note.sale_total,
                        cash: paid.cash,
                        card: paid.card,
                        transfer: paid.transfer,
                        purchase_total: note.purchase_total,
                        status: note.status,
                        delivery_status: note.delivery_status,
                    };
                })
            ),
            expenses: JSON.stringify(expenses.slice(0, expenses.length - 1)),
            previous_notes: JSON.stringify(
                previousNotes.slice(0, previousNotes.length - 1)
            ),
            returns: JSON.stringify(returns.slice(0, returns.length - 1)),
            branch_id: branch.id,
        });
    };

    useEffect(() => {
        const sums = calculateSums(
            notes,
            expenses,
            previousNotes,
            returns,
            date
        );

        setSums(sums);
    }, [notes, expenses, previousNotes, returns, date]);

    return (
        <Container headTitle="Nuevo Corte">
            <div className="flex justify-center">
                <div className="max-w-[1200px] min-w-[400px] w-full border border-gray-300 p-4 py-12">
                    <Flex gap="2" className="mb-4">
                        <Button
                            color="gray"
                            variant="soft"
                            className="hover:cursor-pointer"
                            onClick={() => {
                                router.visit(route("cortes"));
                            }}
                        >
                            <BiArrowBack />
                            Lista de cortes
                        </Button>
                    </Flex>
                    <Flex justify="between" className="mb-4" gap="2">
                        <div className="flex flex-col gap-1">
                            <Text size="2" className="text-gray-500">
                                {branch.name}
                            </Text>
                            <Text size="4" weight="bold">
                                {isDetail
                                    ? `Corte #${corte.id} / ${corte.date}`
                                    : `Generar Corte`}
                            </Text>
                        </div>

                        {!isDetail ? (
                            <Flex gap="2">
                                <Button
                                    onClick={() => {
                                        router.visit(route("cortes.new"));
                                    }}
                                    className="hover:cursor-pointer"
                                >
                                    Crear un corte
                                    <CgAdd className="w-5 h-5" />
                                </Button>
                            </Flex>
                        ) : (
                            <Flex gap="2">
                                <IconButton
                                    color="green"
                                    className="hover:cursor-pointer"
                                    size="2"
                                    onClick={() => {
                                        Inertia.get(
                                            route("cortes.export", {
                                                corte: corte.id,
                                            })
                                        );
                                    }}
                                >
                                    <FaDownload />
                                </IconButton>
                                <IconButton
                                    color="red"
                                    className="hover:cursor-pointer"
                                    size="2"
                                    onClick={() => {
                                        confirmAlert({
                                            title: "Eliminar corte",
                                            message:
                                                "¿Estás seguro de eliminar este corte?",
                                            buttons: [
                                                {
                                                    label: "Sí",
                                                    onClick: () => {
                                                        Inertia.delete(
                                                            route(
                                                                "cortes.destroy",
                                                                {
                                                                    corte: corte.id,
                                                                }
                                                            )
                                                        );
                                                    },
                                                },
                                                {
                                                    label: "No",
                                                },
                                            ],
                                        });
                                    }}
                                >
                                    <BiTrash className="w-5 h-5" />
                                </IconButton>
                                <Button
                                    onClick={() => {
                                        router.visit(route("cortes.new"));
                                    }}
                                    className="hover:cursor-pointer"
                                >
                                    Crear un corte
                                    <CgAdd className="w-5 h-5" />
                                </Button>
                            </Flex>
                        )}
                    </Flex>
                    <AmountDetailsTable
                        total={total}
                        cashSum={cashSum}
                        transferSum={transferSum}
                        cardSum={cardSum}
                        balanceSum={balanceSum}
                        date={date}
                        expensesSum={sums.expensesSum}
                        previousNotesTotal={sums.previousNotesSum}
                        returnsSum={sums.returnsSum}
                        isDisabled={isDetail}
                        branch={branch}
                        purchasesSum={sums.purchasesSum}
                    />
                    <Spacer />
                    <Flex justify="end">
                        {!isDetail && (
                            <IconButton
                                color="green"
                                className="hover:cursor-pointer"
                                size="2"
                                onClick={() => {
                                    axios(
                                        route("api.notas.corte", {
                                            branch: branch.id,
                                            date,
                                        })
                                    ).then((response) => {
                                        setNotes(response.data.notes);
                                        setPreviousNotes([
                                            ...response.data.previous_payments,
                                            emptyPreviousNote,
                                        ]);
                                    });
                                }}
                            >
                                <BiRefresh className="w-5 h-5" />
                            </IconButton>
                        )}
                    </Flex>
                    <NotesTable
                        notes={notes.map((note) => ({
                            ...note,
                            ...paymentsOnDate(note, date),
                        }))}
                        setNotes={setNotes}
                        isEditable={!isDetail}
                    />
                    <Spacer />
                    <PendingNotesTable
                        previousNotes={previousNotes}
                        setPreviousNotes={setPreviousNotes}
                        isDisabled={isDetail}
                        branch={branch}
                    />
                    <Spacer />
                    <ReturnsTable
                        returns={returns}
                        setReturns={setReturns}
                        isDisabled={isDetail}
                    />
                    <Spacer />
                    <ExpensesTable
                        expenses={expenses}
                        setExpenses={setExpenses}
                        isDisabled={isDetail}
                    />
                    <Spacer />
                    {!isDetail && (
                        <Flex justify="end">
                            <Button
                                className="hover:cursor-pointer"
                                onClick={handleSubmit}
                            >
                                Guardar
                                <BiSave />
                            </Button>
                        </Flex>
                    )}
                </div>
            </div>
        </Container>
    );
};

export default CorteForm;
