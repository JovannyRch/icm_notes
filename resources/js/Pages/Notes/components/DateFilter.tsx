import { DATE_FILTERS_VALUES } from "@/const";
import { useBranch } from "@/hooks/useBranch";
import { PageProps } from "@/types";
import { router, usePage } from "@inertiajs/react";
import { Button, Dialog, DropdownMenu, Flex } from "@radix-ui/themes";
import { useEffect, useState } from "react";
import { LuCalendar, LuCalendarRange, LuCheck, LuChevronDown } from "react-icons/lu";
import { useLocalStorage } from "usehooks-ts";

type Preset = keyof typeof DATE_FILTERS_VALUES;

const short = (date: string) =>
    new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`)).replace(".", "");

/** "2 oct" o "28 sep – 4 oct" (y el año si no es el actual). */
const rangeText = ([from, to]: [string, string]) => {
    const year = String(new Date().getFullYear());
    const withYear = (d: string) => (d.startsWith(year) ? short(d) : `${short(d)} ${d.slice(0, 4)}`);
    return from === to ? withYear(from) : `${withYear(from)} – ${withYear(to)}`;
};

/**
 * Filtro de fecha de la lista de notas: periodos rápidos (Hoy, Ayer, esta semana…) o un
 * rango propio (?date=CUSTOM&desde=&hasta=). La píldora muestra las fechas exactas que
 * aplicó el servidor (`dateRange`). El periodo rápido se recuerda por sucursal.
 */
const DateFilter = () => {
    const { currentBranchId } = useBranch();
    const { dateRange } = usePage<PageProps<{ dateRange: [string, string] | null }>>().props;
    const params = route().params as Record<string, string>;
    const [stored, setStored] = useLocalStorage(`date-filter-${currentBranchId}`, "THIS_WEEK");
    const current = params.date ?? stored;

    const [customOpen, setCustomOpen] = useState(false);
    const [from, setFrom] = useState(params.desde ?? dateRange?.[0] ?? "");
    const [to, setTo] = useState(params.hasta ?? dateRange?.[1] ?? "");

    useEffect(() => {
        if (params.date && params.date !== "CUSTOM" && params.date !== stored) setStored(params.date);
    }, [params.date]);

    const go = (date: string, extra: Record<string, string> = {}) => {
        const next: Record<string, string> = { ...params };
        delete next.page;
        delete next.desde;
        delete next.hasta;
        router.get(route("notas"), { ...next, date, ...extra });
    };

    const label = current === "CUSTOM" ? "Fechas" : DATE_FILTERS_VALUES[current as Preset] ?? "Esta semana";
    const showRange = dateRange && current !== "ALL_TIME";

    return (
        <>
            <DropdownMenu.Root>
                <DropdownMenu.Trigger>
                    <button
                        type="button"
                        aria-label={`Fecha: ${label}`}
                        className="inline-flex items-center gap-1.5 h-8 px-3 text-[13px] rounded-tag border bg-sky-tint border-sky-tint text-charcoal focus:outline-none focus-visible:ring-2 focus-visible:ring-electric/30"
                    >
                        <LuCalendar className="w-3.5 h-3.5 text-fog" aria-hidden />
                        <span className="font-medium">Fecha</span>
                        <span className="text-electric">: {label}</span>
                        {showRange && <span className="text-steel tabular-nums">· {rangeText(dateRange!)}</span>}
                        <LuChevronDown className="w-3.5 h-3.5 text-fog" aria-hidden />
                    </button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Content variant="soft" color="gray">
                    {(Object.keys(DATE_FILTERS_VALUES) as Preset[]).map((key) => (
                        <DropdownMenu.Item
                            key={key}
                            onSelect={() => {
                                setStored(key);
                                go(key);
                            }}
                        >
                            <span className="flex-1">{DATE_FILTERS_VALUES[key]}</span>
                            {current === key && <LuCheck className="text-electric" aria-hidden />}
                        </DropdownMenu.Item>
                    ))}
                    <DropdownMenu.Separator />
                    <DropdownMenu.Item onSelect={() => setCustomOpen(true)}>
                        <LuCalendarRange /> <span className="flex-1">Elegir fechas…</span>
                        {current === "CUSTOM" && <LuCheck className="text-electric" aria-hidden />}
                    </DropdownMenu.Item>
                </DropdownMenu.Content>
            </DropdownMenu.Root>

            <Dialog.Root open={customOpen} onOpenChange={setCustomOpen}>
                <Dialog.Content maxWidth="400px">
                    <Dialog.Title>Elegir fechas</Dialog.Title>
                    <Dialog.Description size="2" mb="4">
                        Notas de un día o de un rango. Deja “Hasta” vacío para un solo día.
                    </Dialog.Description>
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            if (!from && !to) return;
                            setCustomOpen(false);
                            go("CUSTOM", { ...(from ? { desde: from } : {}), ...(to ? { hasta: to } : {}) });
                        }}
                    >
                        <div className="grid grid-cols-2 gap-3">
                            <label className="text-sm font-medium text-graphite">
                                Desde
                                <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-full px-2 py-1.5 mt-1 bg-white" />
                            </label>
                            <label className="text-sm font-medium text-graphite">
                                Hasta
                                <input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} className="w-full px-2 py-1.5 mt-1 bg-white" />
                            </label>
                        </div>
                        <Flex gap="2" justify="end" mt="5">
                            <Dialog.Close>
                                <Button type="button" variant="outline" color="gray">
                                    Cancelar
                                </Button>
                            </Dialog.Close>
                            <Button type="submit" disabled={!from && !to}>
                                Ver notas
                            </Button>
                        </Flex>
                    </form>
                </Dialog.Content>
            </Dialog.Root>
        </>
    );
};

export default DateFilter;
