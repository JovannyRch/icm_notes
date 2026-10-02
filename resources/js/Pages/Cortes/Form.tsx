import Container from "@/Components/Container";
import { useUpdateEffect } from "@/hooks/useUpdateEffect";
import { PageProps } from "@/types";

import { Note } from "@/types/Note";
import { Button, Flex, Text } from "@radix-ui/themes";
import { formatDate } from "date-fns";
import { es } from "date-fns/locale/es";
import { useEffect, useRef, useState } from "react";
import DatePicker from "react-datepicker";
import { BiArrowBack, BiRefresh, BiSave, BiTrash } from "react-icons/bi";
import NotesTable from "./components/NotesTable";
import PendingNotesTable from "./components/PendingNotesTable";
import CorteSummary from "./components/CorteSummary";
import SectionCard from "@/Components/SectionCard";
import PageHeader from "@/Components/ui/PageHeader";
import { formatCurrency } from "@/helpers/formatters";
import ExpensesTable from "./components/ExpensesTable";
import { isNumber } from "@/helpers/utils";
import { Corte } from "@/types/Corte";
import useAlerts from "@/hooks/useAlerts";
import { confirmAlert } from "react-confirm-alert";
import ReturnsTable from "./components/ReturnsTable";
import { router } from "@inertiajs/react";
import { FaDownload } from "react-icons/fa6";
import { toast } from "react-toastify";
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

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

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

    const [saving, setSaving] = useState(false);
    // ref además del estado: dos clics en el mismo tick no alcanzan a ver el re-render.
    const savingRef = useRef(false);
    const [refreshing, setRefreshing] = useState(false);

    const handleSubmit = () => {
        if (savingRef.current) return;
        savingRef.current = true;
        setSaving(true);
        router.post(route("cortes.store"), {
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
        }, {
            // Evita guardar el mismo corte dos veces con doble clic.
            onFinish: () => {
                savingRef.current = false;
                setSaving(false);
            },
        });
    };

    const refreshNotes = () => {
        setRefreshing(true);
        axios(route("api.notas.corte", { branch: branch.id, date }))
            .then((response) => {
                setNotes(response.data.notes);
                setPreviousNotes([...response.data.previous_payments, emptyPreviousNote]);
                toast.success("Notas y entradas actualizadas");
            })
            .catch(() => toast.error("No se pudieron actualizar las notas"))
            .finally(() => setRefreshing(false));
    };

    const confirmDelete = () => {
        confirmAlert({
            title: "Eliminar corte",
            message: "¿Estás seguro de eliminar este corte?",
            buttons: [
                { label: "Sí", onClick: () => router.delete(route("cortes.destroy", { corte: corte!.id })) },
                { label: "No" },
            ],
        });
    };

    const selectedDate = new Date(date + "T00:00");
    const activeNotes = notes.filter((n) => n.status !== "canceled" && n.delivery_status !== "cancelado").length;

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
        <Container headTitle={isDetail ? `Corte #${corte.id}` : "Nuevo corte"}>
            <div className={isDetail ? "" : "pb-28 sm:pb-16"}>
                <PageHeader
                    back={{ label: "Lista de cortes", href: route("cortes") }}
                    eyebrow={branch.name}
                    title={isDetail ? `Corte #${corte.id}` : "Corte del día"}
                    description={
                        isDetail
                            ? capitalize(formatDate(selectedDate, "EEEE d 'de' MMMM 'de' yyyy", { locale: es }))
                            : undefined
                    }
                    actions={
                        isDetail ? (
                        <Flex gap="2" wrap="wrap">
                            <Button
                                variant="outline"
                                color="gray"
                                onClick={() => (window.location.href = route("cortes.export", { corte: corte.id }))}
                            >
                                <FaDownload />
                                Descargar PDF
                            </Button>
                            <Button color="red" variant="soft" onClick={confirmDelete}>
                                <BiTrash />
                                Eliminar
                            </Button>
                            <Button onClick={() => router.visit(route("cortes.new"))}>
                                Nuevo corte
                                <CgAdd className="w-5 h-5" />
                            </Button>
                        </Flex>
                        ) : (
                        <Flex gap="3" align="end" wrap="wrap">
                            <label className="text-xs text-steel">
                                Fecha del corte
                                <DatePicker
                                    locale={es}
                                    dateFormat={"dd/MM/yyyy"}
                                    className="block h-8 px-3 text-sm bg-white w-[150px]"
                                    selected={selectedDate}
                                    onSelect={(picked) => {
                                        if (!picked) return;
                                        router.visit(
                                            route("cortes.new", {
                                                branch: branch.id,
                                                date: formatDate(picked, "yyyy-MM-dd"),
                                            })
                                        );
                                    }}
                                />
                            </label>
                            <Button
                                variant="outline"
                                color="gray"
                                disabled={refreshing}
                                onClick={refreshNotes}
                                title="Vuelve a cargar las notas y los pagos de este día"
                            >
                                <BiRefresh className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
                                Actualizar notas
                            </Button>
                        </Flex>
                        )
                    }
                />

                <div className="mb-5">
                    <CorteSummary
                        total={total}
                        cashSum={cashSum}
                        transferSum={transferSum}
                        cardSum={cardSum}
                        balanceSum={balanceSum}
                        expensesSum={sums.expensesSum}
                        previousNotesTotal={sums.previousNotesSum}
                        returnsSum={sums.returnsSum}
                        purchasesSum={sums.purchasesSum}
                    />
                </div>

                <div className="space-y-4">
                    <SectionCard
                        title="Venta con notas de pedido"
                        subtitle={`${activeNotes} ${activeNotes === 1 ? "nota" : "notas"} del día${
                            notes.length > activeNotes ? ` · ${notes.length - activeNotes} cancelada(s), no suman` : ""
                        }`}
                    >
                        <NotesTable
                            notes={notes.map((note) => ({
                                ...note,
                                ...paymentsOnDate(note, date),
                            }))}
                            setNotes={setNotes}
                            isEditable={!isDetail}
                        />
                    </SectionCard>

                    <SectionCard
                        title="Entradas anteriores"
                        subtitle="Pagos recibidos este día de notas de días anteriores"
                    >
                        <PendingNotesTable
                            previousNotes={previousNotes}
                            setPreviousNotes={setPreviousNotes}
                            isDisabled={isDetail}
                            branch={branch}
                        />
                    </SectionCard>

                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                        <SectionCard title="Devoluciones" subtitle="Se descuentan del efectivo">
                            <ReturnsTable returns={returns} setReturns={setReturns} isDisabled={isDetail} />
                        </SectionCard>
                        <SectionCard title="Gastos" subtitle="Se descuentan del efectivo">
                            <ExpensesTable expenses={expenses} setExpenses={setExpenses} isDisabled={isDetail} />
                        </SectionCard>
                    </div>
                </div>
            </div>

            {!isDetail && (
                <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-white/95 backdrop-blur border-ash">
                    <div className="flex flex-wrap items-center justify-between max-w-[1200px] gap-3 px-6 py-3 mx-auto">
                        <div className="flex flex-wrap text-sm gap-x-6 gap-y-1 tabular-nums">
                            <span>
                                <span className="text-fog">Venta </span>
                                <span className="font-semibold">{formatCurrency(total)}</span>
                            </span>
                            <span>
                                <span className="text-fog">Efectivo </span>
                                <span className={`font-semibold ${cashSum < 0 ? "text-[#d03b3b]" : ""}`}>
                                    {formatCurrency(cashSum)}
                                </span>
                            </span>
                        </div>
                        <Button size="3" disabled={saving} onClick={handleSubmit}>
                            {saving ? "Guardando..." : "Guardar corte"}
                            <BiSave />
                        </Button>
                    </div>
                </div>
            )}
        </Container>
    );
};

export default CorteForm;
