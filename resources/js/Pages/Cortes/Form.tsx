import { useCan } from "@/hooks/useCan";
import Container from "@/Components/Container";
import { useUpdateEffect } from "@/hooks/useUpdateEffect";
import { PageProps } from "@/types";

import { Note } from "@/types/Note";
import { Button, Flex, Text } from "@radix-ui/themes";
import { formatDate } from "date-fns";
import { es } from "date-fns/locale/es";
import { useEffect, useRef, useState } from "react";
import DatePicker from "react-datepicker";
import { BiRefresh, BiSave, BiTrash } from "react-icons/bi";
import NotesTable from "./components/NotesTable";
import PendingNotesTable from "./components/PendingNotesTable";
import CashSummary from "./components/CashSummary";
import { isCreditNote } from "./components/NotesTable";
import { LuChevronLeft, LuChevronRight } from "react-icons/lu";
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
            card_credit: Number(note.card_credit ?? 0),
            card_debit: Number(note.card_debit ?? 0),
            transfer: Number(note.transfer ?? 0),
        };
    }

    return note.payments
        .filter((payment) => payment.date === date)
        .reduce(
            (acc, payment) => ({
                cash: acc.cash + Number(payment.cash ?? 0),
                card: acc.card + Number(payment.card ?? 0),
                card_credit: acc.card_credit + (payment.card_type === "credito" ? Number(payment.card ?? 0) : 0),
                card_debit: acc.card_debit + (payment.card_type === "debito" ? Number(payment.card ?? 0) : 0),
                transfer: acc.transfer + Number(payment.transfer ?? 0),
            }),
            { cash: 0, card: 0, card_credit: 0, card_debit: 0, transfer: 0 }
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
    let cardCreditSum = 0;
    let cardDebitSum = 0;
    let transferSum = 0;
    let cashSum = 0;
    let balanceSum = 0;
    let total = 0;
    let notesSum = 0;
    let purchasesSum = 0;

    cleanNotes(notes).forEach((note) => {
        const paid = paymentsOnDate(note, date);

        cardSum += paid.card;
        cardCreditSum += paid.card_credit;
        cardDebitSum += paid.card_debit;
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
        if (note.card_type === "credito") cardCreditSum += card;
        if (note.card_type === "debito") cardDebitSum += card;
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
        cardCreditSum,
        cardDebitSum,
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
        cardCreditSum: 0,
        cardDebitSum: 0,
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

    const can = useCan();
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
                        card_credit: paid.card_credit,
                        card_debit: paid.card_debit,
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
    // Ventas a crédito del día (sólo se presentan; no cambian lo que se guarda).
    const creditNotes = cleanNotes(notes).filter(isCreditNote);
    const credit = {
        count: creditNotes.length,
        total: creditNotes.reduce((acc, n) => acc + Number(n.sale_total ?? 0), 0),
        paid: creditNotes.reduce((acc, n) => acc + Number(n.advance ?? 0), 0),
        balance: creditNotes.reduce((acc, n) => acc + Number(n.balance ?? 0), 0),
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

    // Navegar entre días (corte nuevo): el anterior, el siguiente y hoy.
    const goToDate = (value: Date) =>
        router.visit(route("cortes.new", { branch: branch.id, date: formatDate(value, "yyyy-MM-dd") }));
    const shiftDay = (days: number) => {
        const next = new Date(selectedDate);
        next.setDate(next.getDate() + days);
        goToDate(next);
    };
    const longDay = capitalize(formatDate(selectedDate, "EEEE d 'de' MMMM 'de' yyyy", { locale: es }));
    const canceledCount = notes.length - activeNotes;

    const saveButton = (
        <Button size="3" style={{ width: "100%" }} disabled={saving} onClick={handleSubmit}>
            <BiSave />
            {saving ? "Guardando…" : "Guardar corte"}
        </Button>
    );

    return (
        <Container headTitle={isDetail ? `Corte #${corte.id}` : "Corte del día"}>
            <div className={isDetail ? "" : "pb-24 lg:pb-0"}>
                <PageHeader
                    back={{ label: "Cortes", href: route("cortes") }}
                    eyebrow={branch.name}
                    title={isDetail ? `Corte #${corte.id}` : "Corte del día"}
                    description={isDetail ? `${longDay} · guardado` : longDay}
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
                                {can("cortes.manage") && (
                                    <Button color="red" variant="soft" onClick={confirmDelete}>
                                        <BiTrash />
                                        Eliminar
                                    </Button>
                                )}
                            </Flex>
                        ) : (
                            <Flex gap="2" align="center" wrap="wrap">
                                <div className="inline-flex items-center overflow-hidden bg-white border rounded-button border-pebble">
                                    <button
                                        type="button"
                                        onClick={() => shiftDay(-1)}
                                        aria-label="Día anterior"
                                        className="flex items-center justify-center w-8 h-8 text-steel hover:bg-paper"
                                    >
                                        <LuChevronLeft className="w-4 h-4" />
                                    </button>
                                    <DatePicker
                                        locale={es}
                                        dateFormat={"dd/MM/yyyy"}
                                        className="block h-8 px-2 text-sm text-center bg-white border-0 border-x border-ash w-[118px] focus:ring-0"
                                        selected={selectedDate}
                                        onSelect={(picked) => picked && goToDate(picked)}
                                        aria-label="Fecha del corte"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => shiftDay(1)}
                                        aria-label="Día siguiente"
                                        className="flex items-center justify-center w-8 h-8 text-steel hover:bg-paper"
                                    >
                                        <LuChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                                <Button variant="soft" color="gray" onClick={() => goToDate(new Date())}>
                                    Hoy
                                </Button>
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

                <div className="grid items-start gap-4 grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_340px]">
                    {/* Resumen: arriba en celular, a la derecha (fijo al bajar) en escritorio */}
                    <aside className="lg:order-2 lg:sticky lg:top-4">
                        <CashSummary
                            total={total}
                            notesCount={activeNotes}
                            balanceSum={balanceSum}
                            cashSum={cashSum}
                            cardSum={cardSum}
                            cardCreditSum={sums.cardCreditSum}
                            cardDebitSum={sums.cardDebitSum}
                            transferSum={transferSum}
                            expensesSum={sums.expensesSum}
                            returnsSum={sums.returnsSum}
                            previousNotesSum={sums.previousNotesSum}
                            purchasesSum={sums.purchasesSum}
                            credit={credit}
                        >
                            {!isDetail && <div className="hidden lg:block">{saveButton}</div>}
                        </CashSummary>
                    </aside>

                    <div className="space-y-4 lg:order-1">
                        <SectionCard
                            title="Notas del día"
                            subtitle={
                                notes.length === 0
                                    ? "No hay notas en este día."
                                    : `${activeNotes} ${activeNotes === 1 ? "nota" : "notas"}${
                                          canceledCount > 0 ? ` · ${canceledCount} cancelada(s), no suman` : ""
                                      } · se cuentan los pagos de este día`
                            }
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

                        <SectionCard title="Entradas de notas anteriores" subtitle="Pagos recibidos este día de notas de días anteriores">
                            <PendingNotesTable
                                previousNotes={previousNotes}
                                setPreviousNotes={setPreviousNotes}
                                isDisabled={isDetail}
                                branch={branch}
                            />
                        </SectionCard>

                        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                            <SectionCard title="Gastos" subtitle="Salen del efectivo de la caja">
                                <ExpensesTable expenses={expenses} setExpenses={setExpenses} isDisabled={isDetail} />
                            </SectionCard>
                            <SectionCard title="Devoluciones" subtitle="Dinero regresado a clientes; sale del efectivo">
                                <ReturnsTable returns={returns} setReturns={setReturns} isDisabled={isDetail} />
                            </SectionCard>
                        </div>
                    </div>
                </div>
            </div>

            {/* Celular: barra fija con lo esencial y el botón de guardar */}
            {!isDetail && (
                <div className="fixed inset-x-0 bottom-0 z-40 border-t lg:hidden bg-white/95 backdrop-blur border-ash">
                    <div className="flex items-center justify-between gap-3 px-4 py-3 mx-auto max-w-[1200px]">
                        <div className="text-sm leading-tight tabular-nums">
                            <div className="text-fog">Debe haber en caja</div>
                            <div className={`text-lg font-semibold ${cashSum < 0 ? "text-[#d03b3b]" : "text-charcoal"}`}>{formatCurrency(cashSum)}</div>
                        </div>
                        <div className="w-44">{saveButton}</div>
                    </div>
                </div>
            )}
        </Container>
    );
};

export default CorteForm;
