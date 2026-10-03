import { formatCurrency } from "@/helpers/formatters";
import { router } from "@inertiajs/react";
import { Button, Dialog, Flex } from "@radix-ui/themes";
import { useEffect, useState } from "react";

const QUICK_REASONS = ["El cliente se arrepintió", "Error al capturar la venta", "Producto o medida equivocada", "No hay existencias"];

interface Props {
    sale: { id: number; folio: string; sale_total: number } | null;
    onClose: () => void;
}

/**
 * Cancelar una venta de la caja pidiendo el motivo. El servidor lo guarda al final del
 * comentario de la nota, con fecha, hora y quién la canceló.
 */
const CancelSaleDialog = ({ sale, onClose }: Props) => {
    const [reason, setReason] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        setReason("");
        setError(null);
    }, [sale?.id]);

    const submit = () => {
        if (!sale) return;
        if (reason.trim().length < 3) {
            setError("Escribe el motivo de la cancelación.");
            return;
        }
        setProcessing(true);
        router.post(
            route("caja.cancel", sale.id),
            { reason: reason.trim() },
            {
                preserveScroll: true,
                onSuccess: onClose,
                onError: (errors) => setError(errors.reason ?? Object.values(errors)[0] ?? "No se pudo cancelar."),
                onFinish: () => setProcessing(false),
            }
        );
    };

    return (
        <Dialog.Root open={sale !== null} onOpenChange={(open) => !open && onClose()}>
            <Dialog.Content maxWidth="460px">
                <Dialog.Title>Cancelar venta {sale?.folio}</Dialog.Title>
                <Dialog.Description size="2" mb="4">
                    Se cancela la venta de {sale ? formatCurrency(sale.sale_total) : ""}, se quita su pago y las piezas regresan al inventario. No se puede
                    deshacer.
                </Dialog.Description>

                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        submit();
                    }}
                >
                    <label htmlFor="cancel-reason" className="block mb-1 text-sm font-medium text-graphite">
                        Motivo de la cancelación
                    </label>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                        {QUICK_REASONS.map((r) => (
                            <button
                                key={r}
                                type="button"
                                onClick={() => {
                                    setReason(r);
                                    setError(null);
                                }}
                                className={`px-2.5 py-1 text-xs border rounded-full ${
                                    reason === r ? "bg-ink border-ink text-white" : "bg-white border-ash text-steel hover:border-pebble"
                                }`}
                            >
                                {r}
                            </button>
                        ))}
                    </div>
                    <textarea
                        id="cancel-reason"
                        autoFocus
                        rows={3}
                        maxLength={300}
                        placeholder="Escribe por qué se cancela…"
                        value={reason}
                        onChange={(e) => {
                            setReason(e.target.value);
                            setError(null);
                        }}
                        className="w-full px-2.5 py-2 text-sm bg-white border rounded-input border-pebble text-charcoal placeholder:text-fog focus:border-electric focus:ring-2 focus:ring-electric/20"
                    />
                    {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
                    <p className="mt-1 text-xs text-fog">Queda guardado en el comentario de la nota.</p>

                    <Flex gap="2" justify="end" mt="5">
                        <Dialog.Close>
                            <Button type="button" variant="outline" color="gray">
                                No cancelar
                            </Button>
                        </Dialog.Close>
                        <Button type="submit" color="red" disabled={processing}>
                            {processing ? "Cancelando..." : "Cancelar venta"}
                        </Button>
                    </Flex>
                </form>
            </Dialog.Content>
        </Dialog.Root>
    );
};

export default CancelSaleDialog;
