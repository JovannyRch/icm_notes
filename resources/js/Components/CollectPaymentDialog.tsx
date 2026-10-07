import { formatCurrency } from "@/helpers/formatters";
import { useForm } from "@inertiajs/react";
import { Button, Dialog, SegmentedControl } from "@radix-ui/themes";
import { useEffect } from "react";

export interface CollectableNote {
    id: number;
    folio: string;
    customer?: string | null;
    customer_phone?: string | null;
    balance: number;
}

/**
 * Cobro rápido de una nota pendiente: registra el pago con fecha de hoy (entra al corte
 * del día) y, si ya no debe nada, la marca como pagada. Con saldo 0 sólo la marca pagada.
 */
const CollectPaymentDialog = ({ note, onClose }: { note: CollectableNote | null; onClose: () => void }) => {
    const { data, setData, post, processing, errors, reset, clearErrors } = useForm({ method: "cash", amount: "" });
    const owes = !!note && note.balance > 0.009;

    useEffect(() => {
        if (note) {
            clearErrors();
            setData({ method: "cash", amount: owes ? String(note.balance) : "0" });
        }
    }, [note?.id]);

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!note) return;
        post(route("notes.collect", note.id), {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                onClose();
            },
        });
    };

    const amount = Number(data.amount) || 0;
    const remaining = note ? Math.max(note.balance - amount, 0) : 0;

    return (
        <Dialog.Root open={!!note} onOpenChange={(open) => !open && onClose()}>
            <Dialog.Content maxWidth="420px">
                <Dialog.Title>{owes ? `Cobrar nota ${note?.folio}` : `Marcar nota ${note?.folio} como pagada`}</Dialog.Title>
                <Dialog.Description size="2" color="gray">
                    {note?.customer || "Cliente sin nombre"}
                    {note?.customer_phone ? ` · Tel. ${note.customer_phone}` : ""}
                </Dialog.Description>

                <form onSubmit={submit} className="mt-4 space-y-4">
                    {owes ? (
                        <>
                            <div className="flex items-baseline justify-between p-3 rounded-card bg-paper">
                                <span className="text-sm text-steel">Saldo pendiente</span>
                                <span className="text-xl font-semibold tabular-nums text-charcoal">{formatCurrency(note!.balance)}</span>
                            </div>
                            <div>
                                <span className="block mb-1 text-sm font-medium text-charcoal">Cómo pagó</span>
                                <SegmentedControl.Root value={data.method} onValueChange={(v) => setData("method", v)} style={{ width: "100%" }}>
                                    <SegmentedControl.Item value="cash">Efectivo</SegmentedControl.Item>
                                    <SegmentedControl.Item value="card_credito">T. crédito</SegmentedControl.Item>
                                    <SegmentedControl.Item value="card_debito">T. débito</SegmentedControl.Item>
                                    <SegmentedControl.Item value="transfer">Transferencia</SegmentedControl.Item>
                                </SegmentedControl.Root>
                            </div>
                            <label className="block text-sm font-medium text-charcoal">
                                Importe que pagó
                                <input
                                    autoFocus
                                    inputMode="decimal"
                                    value={data.amount}
                                    onChange={(e) => setData("amount", e.target.value)}
                                    onFocus={(e) => e.target.select()}
                                    className="w-full h-10 px-3 mt-1 text-lg bg-white border tabular-nums rounded-input border-pebble focus:border-electric focus:ring-2 focus:ring-electric/20"
                                />
                                {(errors.amount || errors.method) && <span className="block mt-1 text-xs text-red-700">{errors.amount ?? errors.method}</span>}
                                <span className="block mt-1 text-xs font-normal text-fog">
                                    {remaining > 0.009
                                        ? `Abono: la nota sigue pendiente con ${formatCurrency(remaining)}.`
                                        : "Liquida la nota: queda como pagada."}{" "}
                                    El pago entra al corte de hoy.
                                </span>
                            </label>
                        </>
                    ) : (
                        <p className="text-sm text-steel">Esta nota ya no tiene saldo; sólo falta cambiarla a pagada.</p>
                    )}

                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="soft" color="gray" onClick={onClose}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={processing}>
                            {processing ? "Guardando…" : owes ? "Registrar pago" : "Marcar pagada"}
                        </Button>
                    </div>
                </form>
            </Dialog.Content>
        </Dialog.Root>
    );
};

export default CollectPaymentDialog;
