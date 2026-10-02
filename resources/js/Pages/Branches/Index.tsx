import Container from "@/Components/Container";
import InputError from "@/Components/InputError";
import SectionCard from "@/Components/SectionCard";
import PageHeader from "@/Components/ui/PageHeader";
import { printTicket } from "@/helpers/printTicket";
import useAlerts from "@/hooks/useAlerts";
import { PageProps } from "@/types";
import { useForm } from "@inertiajs/react";
import { Button, Switch, Text } from "@radix-ui/themes";
import { LuExternalLink, LuPrinter } from "react-icons/lu";

type TicketFields = {
    business_name: string;
    rfc: string;
    address: string;
    phone: string;
    header: string;
    footer: string;
    show_logo: boolean;
};

interface BranchRow {
    id: number;
    name: string;
    ticket: TicketFields;
    defaults: TicketFields;
}

interface Props extends PageProps {
    branches: BranchRow[];
}

const fieldCls =
    "w-full px-2.5 py-1.5 mt-1 text-sm bg-white border rounded-input border-pebble text-charcoal placeholder:text-fog focus:border-electric focus:ring-2 focus:ring-electric/20";

const BranchTicketForm = ({ branch }: { branch: BranchRow }) => {
    const { data, setData, put, processing, errors, isDirty } = useForm<TicketFields>({ ...branch.ticket, show_logo: !!branch.ticket.show_logo });

    const field = (key: Exclude<keyof TicketFields, "show_logo">, label: string, opts: { multiline?: boolean; hint?: string } = {}) => (
        <label className="block text-sm font-medium text-charcoal">
            {label}
            {opts.multiline ? (
                <textarea
                    rows={2}
                    value={data[key]}
                    placeholder={branch.defaults[key] || undefined}
                    onChange={(e) => setData(key, e.target.value)}
                    className={fieldCls}
                />
            ) : (
                <input value={data[key]} placeholder={branch.defaults[key] || undefined} onChange={(e) => setData(key, e.target.value)} className={`${fieldCls} h-8`} />
            )}
            {opts.hint && <span className="block mt-0.5 text-xs font-normal text-fog">{opts.hint}</span>}
            <InputError message={errors[key]} className="mt-1" />
        </label>
    );

    const sampleUrl = route("branches.ticket.sample", branch.id);

    return (
        <SectionCard
            title={branch.name}
            subtitle={`El ticket dice "CAJA ${branch.name.toUpperCase()}".`}
            actions={
                <div className="flex gap-2">
                    <Button size="1" variant="soft" color="gray" onClick={() => window.open(sampleUrl, "_blank")}>
                        <LuExternalLink /> Ver
                    </Button>
                    <Button size="1" variant="soft" color="gray" onClick={() => printTicket(`${sampleUrl}?print=1`)}>
                        <LuPrinter /> Imprimir prueba
                    </Button>
                </div>
            }
        >
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    put(route("branches.ticket.update", branch.id), { preserveScroll: true });
                }}
                className="grid gap-3 sm:grid-cols-2"
            >
                {field("business_name", "Nombre del negocio")}
                {field("rfc", "RFC")}
                {field("address", "Dirección", { multiline: true })}
                {field("phone", "Teléfono")}
                {field("header", "Leyenda arriba", { multiline: true, hint: "Opcional. Ej.: horario o redes sociales." })}
                {field("footer", "Leyenda al final", { multiline: true, hint: "Ej.: política de cambios y garantías." })}
                <Text as="label" size="2" className="flex items-center gap-2 sm:col-span-2">
                    <Switch checked={data.show_logo} onCheckedChange={(v) => setData("show_logo", v)} />
                    Imprimir el logo
                </Text>
                <div className="flex justify-end sm:col-span-2">
                    <Button type="submit" disabled={processing || !isDirty}>
                        {processing ? "Guardando…" : "Guardar"}
                    </Button>
                </div>
            </form>
        </SectionCard>
    );
};

const Step = ({ n, children }: { n: number; children: React.ReactNode }) => (
    <li className="flex gap-3">
        <span className="flex items-center justify-center w-6 h-6 text-xs font-semibold text-white shrink-0 rounded-tag bg-ink">{n}</span>
        <div className="text-sm text-graphite">{children}</div>
    </li>
);

const BranchesIndex = ({ branches, flash }: Props) => {
    useAlerts(flash);

    return (
        <Container headTitle="Sucursales y ticket">
            <PageHeader title="Sucursales y ticket" description="Lo que imprime el ticket de caja en cada sucursal. Lo vacío usa el texto gris." />

            <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
                <div className="space-y-4">
                    {branches.map((branch) => (
                        <BranchTicketForm key={branch.id} branch={branch} />
                    ))}
                </div>

                <SectionCard title="Configurar la impresora" subtitle="Epson TM-T20IV por USB, una vez por computadora de caja.">
                    <ol className="space-y-3">
                        <Step n={1}>
                            Instala el driver <b>Epson Advanced Printer Driver (APD) para TM-T20IV</b> y conecta la impresora por USB.
                        </Step>
                        <Step n={2}>
                            En las preferencias de la impresora elige papel <b>Roll Paper 80 x Receipt</b> y márgenes en cero. Si hay cajón de dinero,
                            actívalo en <b>Cash Drawer → abrir antes de imprimir</b>.
                        </Step>
                        <Step n={3}>
                            Ponla como <b>impresora predeterminada</b> de Windows.
                        </Step>
                        <Step n={4}>
                            Crea un acceso directo de Chrome con <code className="px-1 rounded bg-paper">--kiosk-printing</code> al final del destino, por
                            ejemplo:
                            <code className="block p-2 mt-1 text-xs break-all rounded bg-paper">
                                "C:\Program Files\Google\Chrome\Application\chrome.exe" --kiosk-printing {window.location.origin}/caja
                            </code>
                            Así el ticket sale directo, sin ventana de impresión. Cierra todas las ventanas de Chrome antes de abrirlo.
                        </Step>
                        <Step n={5}>
                            Presiona <b>Imprimir prueba</b> en la sucursal. Si sale el diálogo de impresión, Chrome no se abrió desde ese acceso directo.
                        </Step>
                    </ol>
                </SectionCard>
            </div>
        </Container>
    );
};

export default BranchesIndex;
