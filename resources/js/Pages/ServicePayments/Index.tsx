import Container from "@/Components/Container";
import ContainerSection from "@/Components/ContainerSection";
import PageHeader from "@/Components/ui/PageHeader";
import StatusPill from "@/Components/StatusPill";
import InputWithLabel from "@/Components/InputWithLabel";
import { formatCurrency, getToday } from "@/helpers/formatters";
import { formatPeriod } from "@/helpers/billing";
import useAlerts from "@/hooks/useAlerts";
import { PageProps } from "@/types";
import { router, useForm } from "@inertiajs/react";
import { Badge, Button, Flex, Table, Text } from "@radix-ui/themes";
import { confirmAlert } from "react-confirm-alert";
import { BiSave } from "react-icons/bi";
import { TbTrash } from "react-icons/tb";

interface ServicePayment {
    id: number;
    period: string;
    paid_at: string;
    amount: string | null;
    notes: string | null;
}

interface Month {
    period: string;
    due_date: string;
    payment: ServicePayment | null;
}

interface Props extends PageProps {
    months: Month[];
    config: {
        start_month: string | null;
        due_day: number;
        current_month: string;
    };
}

const ServicePaymentsIndex = ({ months, config, flash }: Props) => {
    useAlerts(flash);

    const { data, setData, post, processing, errors, reset } = useForm({
        period: config.current_month,
        paid_at: getToday(),
        amount: "",
        notes: "",
    });

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        post(route("service-payments.store"), {
            preserveScroll: true,
            onSuccess: () => reset("amount", "notes"),
        });
    };

    const handleDelete = (payment: ServicePayment) => {
        confirmAlert({
            title: "Eliminar pago",
            message: `¿Eliminar el pago de ${formatPeriod(payment.period)}? El mes volverá a quedar pendiente.`,
            buttons: [
                {
                    label: "Eliminar",
                    onClick: () =>
                        router.delete(
                            route("service-payments.destroy", payment.id),
                            { preserveScroll: true }
                        ),
                },
                { label: "Cancelar" },
            ],
        });
    };

    const statusBadge = (month: Month) => {
        if (month.payment) return <StatusPill tone="green">Pagado</StatusPill>;
        const overdue =
            month.period < config.current_month || getToday() > month.due_date;
        return overdue ? (
            <StatusPill tone="red">Vencido</StatusPill>
        ) : (
            <StatusPill tone="amber">Pendiente</StatusPill>
        );
    };

    return (
        <Container headTitle="Pagos del servicio">
            <PageHeader
                title="Pagos del servicio"
                description={
                    config.start_month
                        ? `Se cobra desde ${formatPeriod(config.start_month)}. Fecha límite: día ${config.due_day} de cada mes.`
                        : "El recordatorio está apagado: define BILLING_START_MONTH en el .env para activarlo."
                }
            />

            <ContainerSection title="Registrar pago">
                <form
                    onSubmit={handleSubmit}
                    className="grid items-end grid-cols-1 gap-4 md:grid-cols-5"
                >
                    <div>
                        <label
                            htmlFor="period"
                            className="block text-sm font-medium text-graphite"
                        >
                            Mes que se paga
                        </label>
                        <input
                            id="period"
                            type="month"
                            value={data.period}
                            onChange={(e) => setData("period", e.target.value)}
                            className="w-full h-8 mt-1 text-sm bg-white"
                        />
                        {errors.period && (
                            <p className="mt-1 text-sm text-red-600">
                                {errors.period}
                            </p>
                        )}
                    </div>
                    <InputWithLabel
                        label="Fecha de pago"
                        name="paid_at"
                        type="date"
                        value={data.paid_at}
                        onChange={(e) => setData("paid_at", e.target.value)}
                        error={errors.paid_at}
                    />
                    <InputWithLabel
                        label="Monto (opcional)"
                        name="amount"
                        type="number"
                        value={data.amount}
                        onChange={(e) => setData("amount", e.target.value)}
                        error={errors.amount}
                    />
                    <InputWithLabel
                        label="Notas (opcional)"
                        name="notes"
                        value={data.notes}
                        onChange={(e) => setData("notes", e.target.value)}
                        error={errors.notes}
                    />
                    <Button
                        type="submit"
                        disabled={processing}
                        className="hover:cursor-pointer"
                    >
                        {processing ? "Guardando..." : "Registrar pago"}
                        <BiSave />
                    </Button>
                </form>
            </ContainerSection>

            <ContainerSection title="Historial">
                {months.length === 0 ? (
                    <p className="py-8 text-center text-fog">
                        Aún no hay meses que mostrar.
                    </p>
                ) : (
                    <Table.Root>
                        <Table.Header>
                            <Table.Row>
                                <Table.ColumnHeaderCell>Mes</Table.ColumnHeaderCell>
                                <Table.ColumnHeaderCell>Estado</Table.ColumnHeaderCell>
                                <Table.ColumnHeaderCell>
                                    Fecha límite
                                </Table.ColumnHeaderCell>
                                <Table.ColumnHeaderCell>
                                    Fecha de pago
                                </Table.ColumnHeaderCell>
                                <Table.ColumnHeaderCell>Monto</Table.ColumnHeaderCell>
                                <Table.ColumnHeaderCell>Notas</Table.ColumnHeaderCell>
                                <Table.ColumnHeaderCell />
                            </Table.Row>
                        </Table.Header>
                        <Table.Body>
                            {months.map((month) => (
                                <Table.Row key={month.period}>
                                    <Table.Cell className="capitalize">
                                        {formatPeriod(month.period)}
                                    </Table.Cell>
                                    <Table.Cell>{statusBadge(month)}</Table.Cell>
                                    <Table.Cell>{month.due_date}</Table.Cell>
                                    <Table.Cell>
                                        {month.payment?.paid_at ?? "-"}
                                    </Table.Cell>
                                    <Table.Cell>
                                        {month.payment?.amount
                                            ? formatCurrency(
                                                  Number(month.payment.amount)
                                              )
                                            : "-"}
                                    </Table.Cell>
                                    <Table.Cell>
                                        {month.payment?.notes ?? "-"}
                                    </Table.Cell>
                                    <Table.Cell>
                                        <Flex justify="end">
                                            {month.payment ? (
                                                <Button
                                                    type="button"
                                                    color="red"
                                                    variant="ghost"
                                                    className="hover:cursor-pointer"
                                                    onClick={() =>
                                                        handleDelete(
                                                            month.payment!
                                                        )
                                                    }
                                                >
                                                    <TbTrash />
                                                </Button>
                                            ) : (
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    color="gray"
                                                    size="1"
                                                    className="hover:cursor-pointer"
                                                    onClick={() => {
                                                        setData(
                                                            "period",
                                                            month.period
                                                        );
                                                        window.scrollTo({
                                                            top: 0,
                                                            behavior: "smooth",
                                                        });
                                                    }}
                                                >
                                                    Marcar pagado
                                                </Button>
                                            )}
                                        </Flex>
                                    </Table.Cell>
                                </Table.Row>
                            ))}
                        </Table.Body>
                    </Table.Root>
                )}
            </ContainerSection>
        </Container>
    );
};

export default ServicePaymentsIndex;
