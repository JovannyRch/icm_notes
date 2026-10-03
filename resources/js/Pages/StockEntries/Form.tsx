import Container from "@/Components/Container";
import PageHeader from "@/Components/ui/PageHeader";
import { formatCurrency, getToday } from "@/helpers/formatters";
import useAlerts from "@/hooks/useAlerts";
import { useBranch } from "@/hooks/useBranch";
import { useBranchExtra } from "@/hooks/useBranchExtra";
import { PageProps } from "@/types";
import { Product } from "@/types/Product";
import { router } from "@inertiajs/react";
import { Button, Checkbox, Switch, Text } from "@radix-ui/themes";
import { KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { LuPackagePlus, LuSave, LuTrash2 } from "react-icons/lu";
import { toast } from "react-toastify";
import ProductSearchBox from "./components/ProductSearchBox";

interface EntryRow {
    product: Product;
    quantity: string;
    cost: string;
    iva: string;
    extra: string;
}

interface Props extends PageProps {
    suppliers: string[];
}

const num = (v: string) => (v.trim() === "" || isNaN(Number(v)) ? 0 : Number(v));
const round2 = (n: number) => Math.round(n * 100) / 100;
const str = (v: unknown) => (v === null || v === undefined ? "" : String(Number(v)));

const inputCls =
    "h-9 w-full px-2.5 text-sm bg-white border rounded-input border-pebble text-charcoal tabular-nums focus:border-electric focus:ring-2 focus:ring-electric/20 disabled:bg-paper disabled:text-steel";

const Field = ({ label, htmlFor, children, error }: { label: string; htmlFor: string; children: React.ReactNode; error?: string }) => (
    <div>
        <label htmlFor={htmlFor} className="block mb-1 text-xs font-medium text-steel">
            {label}
        </label>
        {children}
        {error && <p className="mt-1 text-xs text-red-700">{error}</p>}
    </div>
);

/**
 * Nueva nota de entrada: lo que se compró al proveedor, con costo, IVA y extra por
 * producto (vienen del catálogo y se pueden corregir) y el total que se le paga. Al
 * guardar, las piezas se suman al inventario de la sucursal activa.
 */
const StockEntryForm = ({ flash, suppliers }: Props) => {
    useAlerts(flash);
    const { currentBranchName, currentBranchId } = useBranch();
    const { globalExtra } = useBranchExtra();

    const [rows, setRows] = useState<EntryRow[]>([]);
    const [date, setDate] = useState(getToday());
    const [supplier, setSupplier] = useState("");
    const [reference, setReference] = useState("");
    const [notes, setNotes] = useState("");
    const [paid, setPaid] = useState(false);
    const [updateCatalog, setUpdateCatalog] = useState(true);
    const searchRef = useRef<HTMLInputElement>(null);
    const quantityRefs = useRef<Record<number, HTMLInputElement | null>>({});
    // Después de agregar, el cursor salta a la cantidad de ese producto.
    const [focusId, setFocusId] = useState<number | null>(null);
    const [processing, setProcessing] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const addProduct = (product: Product) => {
        setErrors({});
        setRows((r) =>
            r.some((row) => row.product.id === product.id)
                ? // Ya estaba: se suma uno a su cantidad en vez de repetirlo.
                  r.map((row) => (row.product.id === product.id ? { ...row, quantity: String(num(row.quantity) + 1) } : row))
                : [...r, { product, quantity: "1", cost: str(product.cost), iva: str(product.iva ?? 16), extra: str(product.extra ?? 0) }]
        );
        setFocusId(product.id);
    };

    useEffect(() => {
        if (focusId === null) return;
        quantityRefs.current[focusId]?.select();
        setFocusId(null);
    }, [focusId]);

    // "/" lleva al buscador desde cualquier parte que no sea un campo de texto.
    useEffect(() => {
        const onKey = (e: globalThis.KeyboardEvent) => {
            const el = e.target as HTMLElement;
            if (e.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName)) {
                e.preventDefault();
                searchRef.current?.focus();
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, []);

    // Enter en cantidad, costo, IVA o extra: listo, de regreso al buscador por el siguiente.
    const backToSearch = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            e.preventDefault();
            searchRef.current?.focus();
        }
    };

    const updateRow = (index: number, patch: Partial<EntryRow>) => {
        setErrors({});
        setRows((r) => r.map((row, i) => (i === index ? { ...row, ...patch } : row)));
    };

    const lines = useMemo(
        () =>
            rows.map((r) => {
                const qty = num(r.quantity);
                const cost = num(r.cost);
                const iva = num(r.iva);
                const extra = globalExtra ?? num(r.extra);
                const base = cost * qty;
                const withIva = base * (1 + iva / 100);
                const subtotal = round2(withIva * (1 + extra / 100));
                return { qty, base, ivaAmount: withIva - base, subtotal, unit: qty > 0 ? subtotal / qty : 0 };
            }),
        [rows, globalExtra]
    );

    const totals = useMemo(() => {
        const base = lines.reduce((a, l) => a + l.base, 0);
        const iva = lines.reduce((a, l) => a + l.ivaAmount, 0);
        const total = round2(lines.reduce((a, l) => a + l.subtotal, 0));
        return { pieces: lines.reduce((a, l) => a + l.qty, 0), base: round2(base), iva: round2(iva), extra: round2(total - base - iva), total };
    }, [lines]);

    const changed = (r: EntryRow) => ({
        cost: Math.abs(num(r.cost) - Number(r.product.cost ?? 0)) >= 0.005,
        iva: Math.abs(num(r.iva) - Number(r.product.iva ?? 0)) >= 0.005,
        extra: globalExtra === null && Math.abs(num(r.extra) - Number(r.product.extra ?? 0)) >= 0.005,
    });
    const anyChanged = rows.some((r) => Object.values(changed(r)).some(Boolean));

    const rowError = (i: number) => errors[`items.${i}.quantity`] ?? errors[`items.${i}.cost`] ?? errors[`items.${i}.product_id`] ?? errors[`items.${i}.iva`] ?? errors[`items.${i}.extra`];

    const submit = () => {
        if (rows.length === 0) {
            toast.warning("Agrega al menos un producto.");
            return;
        }
        setProcessing(true);
        router.post(
            route("stock-entries.store"),
            {
                date,
                supplier: supplier.trim() || null,
                reference: reference.trim() || null,
                notes: notes.trim() || null,
                paid,
                update_catalog: anyChanged && updateCatalog,
                items: rows.map((r) => ({ product_id: r.product.id, quantity: r.quantity, cost: r.cost, iva: r.iva || 0, extra: r.extra || 0 })),
            },
            {
                onError: (errs) => setErrors(errs as Record<string, string>),
                onFinish: () => setProcessing(false),
            }
        );
    };

    return (
        <Container headTitle="Nueva nota de entrada">
            <PageHeader
                back={{ label: "Notas de entrada", href: route("stock-entries.index") }}
                eyebrow={currentBranchName}
                title="Nueva nota de entrada"
                description="Lo que se compró al proveedor. Al guardar, las piezas se suman al inventario de esta sucursal."
            />

            <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
                <section className="bg-white border border-ash rounded-card">
                    <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-ash">
                        <div>
                            <h2 className="text-base font-semibold text-charcoal">Productos</h2>
                            {globalExtra !== null && (
                                <p className="text-xs text-fog">La sucursal tiene extra global de {globalExtra}%: se aplica a todos los productos.</p>
                            )}
                        </div>
                        {rows.length > 0 && <span className="text-xs text-fog">Enter en un campo regresa al buscador</span>}
                    </div>
                    <div className="px-4 py-3 border-b border-ash">
                        <ProductSearchBox ref={searchRef} branchId={currentBranchId} onPick={addProduct} />
                    </div>

                    {errors.items && <p className="px-4 pt-3 text-sm text-red-700">{errors.items}</p>}

                    {rows.length === 0 ? (
                        <div className="flex flex-col items-center w-full gap-2 px-4 py-12 text-center text-fog">
                            <LuPackagePlus className="w-8 h-8" aria-hidden />
                            <span className="text-sm">Busca arriba los productos que llegaron del proveedor y presiona Enter para agregarlos.</span>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm min-w-[760px]">
                                <thead>
                                    <tr className="text-xs text-left border-b text-fog border-ash">
                                        <th className="px-4 py-2 font-medium">Producto</th>
                                        <th className="w-24 px-2 py-2 font-medium">Cantidad</th>
                                        <th className="px-2 py-2 font-medium w-28">Costo</th>
                                        <th className="w-20 px-2 py-2 font-medium">IVA %</th>
                                        <th className="w-20 px-2 py-2 font-medium">Extra %</th>
                                        <th className="px-2 py-2 font-medium text-right">Costo real</th>
                                        <th className="px-2 py-2 font-medium text-right">Importe</th>
                                        <th className="w-10" aria-label="Quitar" />
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((row, i) => {
                                        const p = row.product;
                                        const name = `${p.brand} ${p.model}`.trim();
                                        const diff = changed(row);
                                        const error = rowError(i);
                                        return (
                                            <tr key={p.id} className="align-top border-b border-ash/70">
                                                <td className="px-4 py-2.5">
                                                    <div className="font-medium text-charcoal">{name}</div>
                                                    <div className="text-xs text-fog">
                                                        {[p.measure, p.unit, p.mc ? `${p.mc} m²/caja` : null].filter(Boolean).join(" · ")}
                                                    </div>
                                                    {error && <p className="mt-1 text-xs text-red-700">{error}</p>}
                                                </td>
                                                <td className="px-2 py-2">
                                                    <input
                                                        aria-label={`Cantidad de ${name}`}
                                                        onKeyDown={backToSearch}
                                                        ref={(el) => (quantityRefs.current[p.id] = el)}
                                                        inputMode="decimal"
                                                        value={row.quantity}
                                                        onChange={(e) => updateRow(i, { quantity: e.target.value })}
                                                        className={`${inputCls} text-right`}
                                                    />
                                                </td>
                                                <td className="px-2 py-2">
                                                    <input
                                                        aria-label={`Costo de ${name}`}
                                                        onKeyDown={backToSearch}
                                                        inputMode="decimal"
                                                        value={row.cost}
                                                        onChange={(e) => updateRow(i, { cost: e.target.value })}
                                                        className={`${inputCls} text-right ${diff.cost ? "!border-amber-500" : ""}`}
                                                    />
                                                    {diff.cost && <div className="mt-0.5 text-[11px] text-amber-800">antes {formatCurrency(Number(p.cost ?? 0))}</div>}
                                                </td>
                                                <td className="px-2 py-2">
                                                    <input
                                                        aria-label={`IVA de ${name}`}
                                                        onKeyDown={backToSearch}
                                                        inputMode="decimal"
                                                        value={row.iva}
                                                        onChange={(e) => updateRow(i, { iva: e.target.value })}
                                                        className={`${inputCls} text-right ${diff.iva ? "!border-amber-500" : ""}`}
                                                    />
                                                </td>
                                                <td className="px-2 py-2">
                                                    <input
                                                        aria-label={`Extra de ${name}`}
                                                        onKeyDown={backToSearch}
                                                        inputMode="decimal"
                                                        value={globalExtra !== null ? String(globalExtra) : row.extra}
                                                        disabled={globalExtra !== null}
                                                        title={globalExtra !== null ? "Extra global de la sucursal" : undefined}
                                                        onChange={(e) => updateRow(i, { extra: e.target.value })}
                                                        className={`${inputCls} text-right ${diff.extra ? "!border-amber-500" : ""}`}
                                                    />
                                                </td>
                                                <td className="px-2 py-2.5 text-right whitespace-nowrap tabular-nums text-steel" title="Costo por pieza con IVA y extra">
                                                    {formatCurrency(lines[i].unit)}
                                                </td>
                                                <td className="px-2 py-2.5 font-semibold text-right whitespace-nowrap tabular-nums text-charcoal">
                                                    {formatCurrency(lines[i].subtotal)}
                                                </td>
                                                <td className="py-2 pr-3">
                                                    <button
                                                        type="button"
                                                        aria-label={`Quitar ${name}`}
                                                        onClick={() => setRows((r) => r.filter((_, j) => j !== i))}
                                                        className="p-2 rounded text-fog hover:text-red-700 hover:bg-rose-tint"
                                                    >
                                                        <LuTrash2 className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>

                <aside className="space-y-4 lg:sticky lg:top-4">
                    <section className="p-4 space-y-3 bg-white border border-ash rounded-card">
                        <h2 className="text-base font-semibold text-charcoal">Datos de la compra</h2>
                        <Field label="Fecha" htmlFor="entry-date" error={errors.date}>
                            <input id="entry-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
                        </Field>
                        <Field label="Proveedor" htmlFor="entry-supplier" error={errors.supplier}>
                            <input
                                id="entry-supplier"
                                list="entry-suppliers"
                                placeholder="Nombre del proveedor"
                                value={supplier}
                                onChange={(e) => setSupplier(e.target.value)}
                                className={inputCls}
                            />
                            <datalist id="entry-suppliers">
                                {suppliers.map((s) => (
                                    <option key={s} value={s} />
                                ))}
                            </datalist>
                        </Field>
                        <Field label="Factura o remisión" htmlFor="entry-reference" error={errors.reference}>
                            <input id="entry-reference" placeholder="Opcional" value={reference} onChange={(e) => setReference(e.target.value)} className={inputCls} />
                        </Field>
                        <Field label="Comentarios" htmlFor="entry-notes" error={errors.notes}>
                            <textarea
                                id="entry-notes"
                                rows={2}
                                placeholder="Opcional"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="w-full px-2.5 py-2 text-sm bg-white border rounded-input border-pebble text-charcoal focus:border-electric focus:ring-2 focus:ring-electric/20"
                            />
                        </Field>
                    </section>

                    <section className="p-4 bg-white border border-ash rounded-card">
                        <dl className="space-y-1.5 text-sm">
                            <div className="flex justify-between">
                                <dt className="text-steel">Piezas</dt>
                                <dd className="tabular-nums text-charcoal">{round2(totals.pieces)}</dd>
                            </div>
                            <div className="flex justify-between">
                                <dt className="text-steel">Costo sin IVA</dt>
                                <dd className="tabular-nums text-charcoal">{formatCurrency(totals.base)}</dd>
                            </div>
                            <div className="flex justify-between">
                                <dt className="text-steel">IVA</dt>
                                <dd className="tabular-nums text-charcoal">{formatCurrency(totals.iva)}</dd>
                            </div>
                            {totals.extra > 0.004 && (
                                <div className="flex justify-between">
                                    <dt className="text-steel">Extra</dt>
                                    <dd className="tabular-nums text-charcoal">{formatCurrency(totals.extra)}</dd>
                                </div>
                            )}
                        </dl>
                        <div className="pt-3 mt-3 border-t border-ash">
                            <div className="text-sm font-medium text-steel">Total a pagar al proveedor</div>
                            <div className="text-3xl font-semibold tracking-tight tabular-nums text-charcoal" data-testid="entry-total">
                                {formatCurrency(totals.total)}
                            </div>
                        </div>

                        <Text as="label" size="2" className="flex items-center justify-between gap-3 pt-3 mt-3 border-t border-ash">
                            <span>
                                Ya se pagó al proveedor
                                <span className="block text-xs text-fog">Si no, queda como “por pagar”.</span>
                            </span>
                            <Switch checked={paid} onCheckedChange={setPaid} />
                        </Text>

                        {anyChanged && (
                            <Text as="label" size="2" className="flex items-start gap-2 p-2 mt-3 rounded bg-amber-tint text-amber-900">
                                <Checkbox checked={updateCatalog} onCheckedChange={(v) => setUpdateCatalog(v === true)} className="mt-0.5" />
                                <span>Guardar los costos nuevos en el catálogo (los marcados en amarillo).</span>
                            </Text>
                        )}

                        <Button type="button" size="3" className="mt-4" style={{ width: "100%" }} disabled={processing || rows.length === 0} onClick={submit}>
                            <LuSave />
                            {processing ? "Guardando…" : "Guardar nota de entrada"}
                        </Button>
                    </section>
                </aside>
            </div>
        </Container>
    );
};

export default StockEntryForm;
