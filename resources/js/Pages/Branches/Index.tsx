import Container from "@/Components/Container";
import InputError from "@/Components/InputError";
import SectionCard from "@/Components/SectionCard";
import PageHeader from "@/Components/ui/PageHeader";
import { printTicket } from "@/helpers/printTicket";
import useAlerts from "@/hooks/useAlerts";
import { PageProps } from "@/types";
import { useForm } from "@inertiajs/react";
import { Button, RadioGroup, SegmentedControl, Switch, Text } from "@radix-ui/themes";
import { LuExternalLink, LuPrinter } from "react-icons/lu";

type TextField = "business_name" | "rfc" | "address" | "phone" | "header" | "footer" | "farewell" | "register_label" | "seller_label";
type Toggle = "show_logo" | "show_business_name" | "show_register" | "show_customer" | "show_m2" | "show_amount_in_words" | "show_payment" | "show_qr" | "show_farewell" | "show_notes";
type SellerMode = "name" | "generic" | "none";

type TicketFields = Record<TextField, string> &
    Record<Toggle, boolean> & {
        seller_mode: SellerMode;
        copies: number;
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

/** Interruptores de "qué se imprime", en el orden en que salen en el ticket. */
const toggles: { key: Toggle; label: string; hint?: string }[] = [
    { key: "show_logo", label: "Logo" },
    { key: "show_business_name", label: "Nombre del negocio" },
    { key: "show_register", label: "Encabezado de caja" },
    { key: "show_customer", label: "Datos del cliente", hint: "Nombre, teléfono y dirección" },
    { key: "show_m2", label: "m² de los pisos", hint: "m² por caja y total de m²" },
    { key: "show_amount_in_words", label: "Importe con letra" },
    { key: "show_payment", label: "Detalle del pago", hint: "Efectivo, recibido y cambio (el saldo pendiente siempre sale)" },
    { key: "show_qr", label: "Código QR de la venta" },
    { key: "show_notes", label: "Comentarios de la venta", hint: "Sólo cuando la venta tiene comentario" },
    { key: "show_farewell", label: "Despedida al final" },
];

const BranchTicketForm = ({ branch }: { branch: BranchRow }) => {
    const { data, setData, put, processing, errors, isDirty } = useForm<TicketFields>({
        ...branch.ticket,
        ...Object.fromEntries(toggles.map((t) => [t.key, branch.ticket[t.key] !== false])),
        seller_mode: branch.ticket.seller_mode ?? "name",
        copies: Number(branch.ticket.copies ?? 1),
    } as TicketFields);
    const fieldErrors = errors as Partial<Record<keyof TicketFields, string>>;

    const field = (key: TextField, label: string, opts: { multiline?: boolean; hint?: string; disabled?: boolean } = {}) => (
        <label className={`block text-sm font-medium ${opts.disabled ? "text-fog" : "text-charcoal"}`}>
            {label}
            {opts.multiline ? (
                <textarea
                    rows={2}
                    value={data[key]}
                    disabled={opts.disabled}
                    placeholder={branch.defaults[key] || undefined}
                    onChange={(e) => setData(key, e.target.value)}
                    className={fieldCls}
                />
            ) : (
                <input
                    value={data[key]}
                    disabled={opts.disabled}
                    placeholder={branch.defaults[key] || undefined}
                    onChange={(e) => setData(key, e.target.value)}
                    className={`${fieldCls} h-8 disabled:bg-paper`}
                />
            )}
            {opts.hint && <span className="block mt-0.5 text-xs font-normal text-fog">{opts.hint}</span>}
            <InputError message={fieldErrors[key]} className="mt-1" />
        </label>
    );

    const sampleUrl = route("branches.ticket.sample", branch.id);

    return (
        <SectionCard
            title={branch.name}
            subtitle={isDirty ? "Hay cambios sin guardar: la prueba imprime lo guardado." : "Lo vacío usa el texto gris."}
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
                className="space-y-5"
            >
                <fieldset className="grid gap-3 sm:grid-cols-2">
                    <legend className="mb-2 text-xs font-semibold tracking-wide uppercase text-fog">Textos</legend>
                    {field("business_name", "Nombre del negocio", { disabled: !data.show_business_name })}
                    {field("rfc", "RFC")}
                    {field("register_label", "Encabezado de caja", {
                        hint: "Lo que sale arriba del folio.",
                        disabled: !data.show_register,
                    })}
                    {field("phone", "Teléfono")}
                    {field("address", "Dirección", { multiline: true })}
                    {field("header", "Leyenda arriba", { multiline: true, hint: "Opcional. Ej.: horario o redes sociales." })}
                    {field("footer", "Términos y condiciones", { multiline: true, hint: "Opcional. Ej.: política de cambios y devoluciones. Sale en letra chica al final." })}
                    {field("farewell", "Despedida", {
                        hint: "La última línea del ticket, en negritas. Ej.: ¡Gracias por su compra! Vuelva pronto.",
                        disabled: !data.show_farewell,
                    })}
                </fieldset>

                <fieldset>
                    <legend className="mb-2 text-xs font-semibold tracking-wide uppercase text-fog">Quién atendió</legend>
                    <div className="grid gap-3">
                        <RadioGroup.Root
                            value={data.seller_mode}
                            onValueChange={(v) => setData("seller_mode", v as SellerMode)}
                            className="flex flex-wrap gap-x-5 gap-y-2"
                        >
                            <RadioGroup.Item value="name">Nombre del usuario</RadioGroup.Item>
                            <RadioGroup.Item value="generic">Texto genérico</RadioGroup.Item>
                            <RadioGroup.Item value="none">No mostrar</RadioGroup.Item>
                        </RadioGroup.Root>
                        {data.seller_mode === "generic" && <div className="sm:max-w-[50%]">{field("seller_label", "Texto en todos los tickets")}</div>}
                    </div>
                    <p className="mt-1.5 text-xs text-fog">
                        {data.seller_mode === "name"
                            ? "El ticket dice “Atendió: Ana Cajera”."
                            : data.seller_mode === "generic"
                              ? `El ticket dice “Atendió: ${data.seller_label || branch.defaults.seller_label}”, sin importar quién vendió. El sistema sigue guardando quién fue.`
                              : "El ticket no dice quién atendió. El sistema sigue guardando quién fue."}
                    </p>
                </fieldset>

                <fieldset>
                    <legend className="mb-2 text-xs font-semibold tracking-wide uppercase text-fog">Qué se imprime</legend>
                    <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
                        {toggles.map((t) => (
                            <Text as="label" size="2" key={t.key} className="flex items-start gap-2.5">
                                <Switch className="mt-0.5" checked={data[t.key]} onCheckedChange={(v) => setData(t.key, v)} />
                                <span>
                                    <span className="block text-charcoal">{t.label}</span>
                                    {t.hint && <span className="block text-xs text-fog">{t.hint}</span>}
                                </span>
                            </Text>
                        ))}
                    </div>
                </fieldset>

                <fieldset>
                    <legend className="mb-2 text-xs font-semibold tracking-wide uppercase text-fog">Copias al imprimir</legend>
                    <SegmentedControl.Root value={String(data.copies)} onValueChange={(v) => setData("copies", Number(v))}>
                        <SegmentedControl.Item value="1">1 ticket</SegmentedControl.Item>
                        <SegmentedControl.Item value="2">2 (cliente y copia)</SegmentedControl.Item>
                    </SegmentedControl.Root>
                    <p className="mt-1.5 text-xs text-fog">La segunda sale marcada “COPIA”, en su propio corte. El PDF siempre es uno.</p>
                </fieldset>

                <div className="flex justify-end">
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
