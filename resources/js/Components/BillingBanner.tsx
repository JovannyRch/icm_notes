import { formatDueDate, formatPeriod } from "@/helpers/billing";
import { PageProps } from "@/types";
import { usePage } from "@inertiajs/react";
import { AlertDialog, Button, Flex } from "@radix-ui/themes";
import { useEffect, useState } from "react";
import { LuTriangleAlert } from "react-icons/lu";

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
                className={`border-b text-sm ${
                    overdue ? "bg-rose-tint border-red-200 text-red-800" : "bg-amber-tint border-amber-200 text-amber-900"
                }`}
            >
                <div className="flex items-center justify-center gap-2 px-4 py-2 mx-auto max-w-[1200px] font-medium text-center">
                    <LuTriangleAlert className="w-4 h-4 shrink-0" aria-hidden />
                    {message}
                </div>
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
