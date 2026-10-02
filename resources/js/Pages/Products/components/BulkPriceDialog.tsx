import { formatCurrency } from "@/helpers/formatters";
import { Product } from "@/types/Product";
import { router } from "@inertiajs/react";
import { Button, Dialog, Flex, SegmentedControl, Select } from "@radix-ui/themes";
import { useState } from "react";

type Field = "price" | "cost";
type Unit = "percent" | "amount";
type Round = "none" | "peso" | "diez";

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Productos seleccionados; vacío = toda la marca. */
    ids: number[];
    brand?: string | null;
    /** null = no se sabe cuántos (la marca tiene más de los que se ven con el filtro). */
    count: number | null;
    /** Productos de la página para la vista previa. */
    preview: Product[];
    onDone?: () => void;
}

/** Mismo cálculo que ProductController::bulkPrice (sólo para la vista previa). */
const apply = (before: number, direction: 1 | -1, unit: Unit, amount: number, round: Round) => {
    const change = direction * amount;
    let after = unit === "percent" ? before * (1 + change / 100) : before + change;
    after = round === "peso" ? Math.round(after) : round === "diez" ? Math.round(after / 10) * 10 : Math.round(after * 100) / 100;
    return after;
};

/** Sube o baja el precio público o el costo de varios productos a la vez (lista nueva del proveedor). */
const BulkPriceDialog = ({ open, onOpenChange, ids, brand, count, preview, onDone }: Props) => {
    const [field, setField] = useState<Field>("price");
    const [direction, setDirection] = useState<1 | -1>(1);
    const [unit, setUnit] = useState<Unit>("percent");
    const [amount, setAmount] = useState("");
    const [round, setRound] = useState<Round>("none");
    const [error, setError] = useState<string | null>(null);
    const [processing, setProcessing] = useState(false);

    const value = Number(amount.replace(",", "."));
    const valid = amount.trim() !== "" && !isNaN(value) && value > 0 && !(unit === "percent" && direction === -1 && value >= 100);
    const label = field === "price" ? "precio público" : "costo";
    const scope = ids.length > 0 ? `${count} ${count === 1 ? "producto seleccionado" : "productos seleccionados"}` : `todos los productos de ${brand}${count !== null ? ` (${count})` : ""}`;

    const submit = () => {
        if (!valid) {
            setError(unit === "percent" && direction === -1 && value >= 100 ? "No se puede bajar 100% o más." : "Escribe un número mayor que 0.");
            return;
        }
        setProcessing(true);
        router.post(
            route("products.bulk-price"),
            { ...(ids.length > 0 ? { ids } : { brand }), field, mode: unit, value: direction * value, round },
            {
                preserveScroll: true,
                onSuccess: () => {
                    onOpenChange(false);
                    setAmount("");
                    onDone?.();
                },
                onError: (errors) => setError(Object.values(errors)[0] ?? "No se pudo guardar."),
                onFinish: () => setProcessing(false),
            }
        );
    };

    const examples = preview.slice(0, 3);

    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Content maxWidth="480px">
                <Dialog.Title>Ajustar precios</Dialog.Title>
                <Dialog.Description size="2" mb="4">
                    Cambia el {label} de {scope}. Las notas ya guardadas no cambian.
                </Dialog.Description>

                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        submit();
                    }}
                    className="space-y-4"
                >
                    <div>
                        <div className="mb-1 text-sm font-medium text-graphite">Qué cambia</div>
                        <SegmentedControl.Root value={field} onValueChange={(v) => setField(v as Field)}>
                            <SegmentedControl.Item value="price">Precio público</SegmentedControl.Item>
                            <SegmentedControl.Item value="cost">Costo</SegmentedControl.Item>
                        </SegmentedControl.Root>
                    </div>

                    <div>
                        <label htmlFor="bulk-amount" className="block mb-1 text-sm font-medium text-graphite">
                            Cuánto
                        </label>
                        <div className="flex flex-wrap items-center gap-2">
                            <SegmentedControl.Root value={String(direction)} onValueChange={(v) => setDirection(v === "1" ? 1 : -1)}>
                                <SegmentedControl.Item value="1">Subir</SegmentedControl.Item>
                                <SegmentedControl.Item value="-1">Bajar</SegmentedControl.Item>
                            </SegmentedControl.Root>
                            <input
                                id="bulk-amount"
                                inputMode="decimal"
                                autoFocus
                                placeholder={unit === "percent" ? "Ej. 8" : "Ej. 20"}
                                value={amount}
                                onChange={(e) => {
                                    setAmount(e.target.value);
                                    setError(null);
                                }}
                                className="w-24 h-8 px-2 text-right bg-white tabular-nums"
                            />
                            <SegmentedControl.Root value={unit} onValueChange={(v) => setUnit(v as Unit)}>
                                <SegmentedControl.Item value="percent">%</SegmentedControl.Item>
                                <SegmentedControl.Item value="amount">$</SegmentedControl.Item>
                            </SegmentedControl.Root>
                        </div>
                        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
                    </div>

                    <div>
                        <div className="mb-1 text-sm font-medium text-graphite">Redondear</div>
                        <Select.Root value={round} onValueChange={(v) => setRound(v as Round)}>
                            <Select.Trigger aria-label="Redondear" variant="surface" />
                            <Select.Content position="popper">
                                <Select.Item value="none">Sin redondear (centavos)</Select.Item>
                                <Select.Item value="peso">Al peso</Select.Item>
                                <Select.Item value="diez">A 10 pesos</Select.Item>
                            </Select.Content>
                        </Select.Root>
                    </div>

                    {valid && examples.length > 0 && (
                        <div className="p-3 text-sm border rounded-card border-ash bg-paper">
                            <div className="mb-1 text-xs font-medium tracking-wide uppercase text-fog">Así quedaría</div>
                            {examples.map((p) => {
                                const before = Number(p[field] ?? 0);
                                const after = apply(before, direction, unit, value, round);
                                return (
                                    <div key={p.id} className="flex items-baseline justify-between gap-3 py-0.5">
                                        <span className="truncate text-steel">
                                            {p.brand} {p.model}
                                        </span>
                                        <span className="tabular-nums shrink-0 text-charcoal">
                                            {formatCurrency(before)} → <b>{after < 0 || (before === 0 && unit === "percent") ? "sin cambio" : formatCurrency(after)}</b>
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    <Flex gap="2" justify="end" pt="2">
                        <Dialog.Close>
                            <Button type="button" variant="outline" color="gray">
                                Cancelar
                            </Button>
                        </Dialog.Close>
                        <Button type="submit" disabled={processing}>
                            {processing ? "Guardando..." : count !== null ? `Cambiar ${count} ${count === 1 ? "producto" : "productos"}` : "Cambiar precios"}
                        </Button>
                    </Flex>
                </form>
            </Dialog.Content>
        </Dialog.Root>
    );
};

export default BulkPriceDialog;
