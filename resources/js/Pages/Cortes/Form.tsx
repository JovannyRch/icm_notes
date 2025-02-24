import Container from "@/Components/Container";
import { useUpdateEffect } from "@/hooks/useUpdateEffect";
import { PageProps } from "@/types";
import { Branch } from "@/types/Branch";
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
import { BsCashCoin } from "react-icons/bs";
import { router } from "@inertiajs/react";

interface Props extends PageProps {
    notes: Note[];
    cashSum: number;
    total: number;
    transferSum: number;
    cardSum: number;
    balanceSum: number;
    branch: Branch;
    corte?: Corte;
    date: string;
}

const Spacer = () => <div className="h-[60px]"></div>;

function calculateSums(
    notes: Note[],
    expenses: ExpenseInput[],
    previousNotes: PreviousNoteInput[],
    returns: ReturnInput[]
): CutSums {
    let cardSum = 0;
    let transferSum = 0;
    let cashSum = 0;
    let balanceSum = 0;
    let total = 0;
    let notesSum = 0;

    notes.forEach((note) => {
        cardSum += Number(note.card ?? 0);
        transferSum += Number(note.transfer ?? 0);
        cashSum += Number(note.cash ?? 0);
        balanceSum += Number(note.balance ?? 0);
        total += Number(note.sale_total ?? 0);
        notesSum += Number(note.sale_total ?? 0);
    });

    const expensesSum = expenses.reduce((acc, expense) => {
        return acc + (isNumber(expense.amount) ? Number(expense.amount) : 0);
    }, 0);

    const previousNotesSum = previousNotes.reduce((acc, note) => {
        return acc + (isNumber(note.amount) ? Number(note.amount) : 0);
    }, 0);

    const returnsSum = returns.reduce((acc, note) => {
        return acc + (isNumber(note.amount) ? Number(note.amount) : 0);
    }, 0);

    cashSum += previousNotesSum - expensesSum - returnsSum;

    return {
        cardSum,
        transferSum,
        cashSum,
        balanceSum,
        total,
        expensesSum,
        previousNotesSum,
        notesSum,
    };
}

const CorteForm = ({
    notes: initialNotes,
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
        previousNotesSum: 0,
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

    const [previousNotes, setPreviousNotes] = useState<PreviousNoteInput[]>(
        isDetail
            ? corte.previous_notes
            : [
                  {
                      folio: "",
                      date: "",
                      amount: "",
                  },
              ]
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

            notes: JSON.stringify(
                notes.map(
                    ({
                        id,
                        date,
                        advance,
                        balance,
                        sale_total,
                        cash,
                        card,
                        transfer,
                        folio,
                    }) => ({
                        id,
                        folio,
                        date,
                        advance,
                        balance,
                        sale_total,
                        cash,
                        card,
                        transfer,
                    })
                )
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
        setSums(calculateSums(notes, expenses, previousNotes, returns));
    }, [notes, expenses, previousNotes, returns]);

    return (
        <Container headTitle="Nuevo Corte">
            <div className="flex justify-center">
                <div className="max-w-[800px] min-w-[400px] w-full border border-gray-300 p-4 py-12">
                    <Flex gap="2" className="mb-4">
                        <Button
                            color="gray"
                            variant="soft"
                            className="hover:cursor-pointer"
                            onClick={() => {
                                router.visit(
                                    route("cortes", {
                                        branch: branch.id,
                                    })
                                );
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
                            <div>
                                <IconButton
                                    color="green"
                                    className="hover:cursor-pointer"
                                    size="2"
                                    onClick={() => {
                                        window.location.reload();
                                    }}
                                >
                                    <BiRefresh className="w-5 h-5" />
                                </IconButton>
                            </div>
                        ) : (
                            <div>
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
                            </div>
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
                        isDisabled={isDetail}
                        branch={branch}
                    />
                    <Spacer />
                    <NotesTable
                        notes={notes}
                        setNotes={setNotes}
                        isEditable={!isDetail}
                    />
                    <Spacer />
                    <PendingNotesTable
                        previousNotes={previousNotes}
                        setPreviousNotes={setPreviousNotes}
                        isDisabled={isDetail}
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
