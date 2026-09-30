import { formatDueDate, formatPeriod } from "@/helpers/billing";
import { PageProps } from "@/types";
import { usePage } from "@inertiajs/react";
import { AlertDialog, Button, Flex } from "@radix-ui/themes";
import { useEffect, useState } from "react";

const SEEN_KEY = "billing-overdue-seen";

/**
 * Recordatorio del pago mensual del sistema. Banner amarillo mientras el mes
 * está en plazo, rojo cuando ya venció; en rojo además abre un aviso una vez
 * por sesión del navegador (se vuelve a mostrar si cambia lo pendiente).
 */
const BillingBanner = () => {
    const { billing } = usePage<PageProps>().props;
    const [dialogOpen, setDialogOpen] = useState(false);

    const overdue = billing?.state === "overdue";
    const seenValue = billing?.pending.join(",") ?? "";

    useEffect(() => {
        if (!overdue) return;
        try {
            if (sessionStorage.getItem(SEEN_KEY) === seenValue) return;
            sessionStorage.setItem(SEEN_KEY, seenValue);
        } catch {
            // sin sessionStorage: se muestra en cada carga completa
        }
        setDialogOpen(true);
    }, [overdue, seenValue]);

    if (!billing || billing.state === "ok" || !billing.due_date) return null;

    const months = billing.pending.map(formatPeriod).join(", ");
    const message = overdue
        ? `El pago mensual del sistema está vencido (${months}). Fecha límite: ${formatDueDate(billing.due_date)}.`
        : `Recordatorio: el pago mensual del sistema de ${months} vence el ${formatDueDate(billing.due_date)}.`;

    return (
        <>
            <div
                role="status"
                className={`px-4 py-2 text-sm font-medium text-center ${
                    overdue
                        ? "bg-red-600 text-white"
                        : "bg-amber-100 text-amber-900 border-b border-amber-200"
                }`}
            >
                {message}
            </div>

            <AlertDialog.Root open={dialogOpen} onOpenChange={setDialogOpen}>
                <AlertDialog.Content maxWidth="450px">
                    <AlertDialog.Title>Pago del sistema vencido</AlertDialog.Title>
                    <AlertDialog.Description size="2">
                        {message} Por favor realiza el pago para mantener el
                        servicio al corriente.
                    </AlertDialog.Description>
                    <Flex justify="end" mt="4">
                        <AlertDialog.Cancel>
                            <Button className="hover:cursor-pointer">
                                Entendido
                            </Button>
                        </AlertDialog.Cancel>
                    </Flex>
                </AlertDialog.Content>
            </AlertDialog.Root>
        </>
    );
};

export default BillingBanner;
