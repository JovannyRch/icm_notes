import Container from "@/Components/Container";
import PageHeader from "@/Components/ui/PageHeader";
import { formatCurrency } from "@/helpers/formatters";
import { getAutoPrint, printTicket, setAutoPrint } from "@/helpers/printTicket";
import useAlerts from "@/hooks/useAlerts";
import { PageProps } from "@/types";
import { Product } from "@/types/Product";
import { router } from "@inertiajs/react";
import { Button, Dialog, IconButton, Switch, Text } from "@radix-ui/themes";
import axios from "axios";
import { KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import { LuBanknote, LuCreditCard, LuHistory, LuMinus, LuPlus, LuPrinter, LuSearch, LuShoppingCart, LuTrash2, LuX } from "react-icons/lu";

interface Rules {
    changePrice: boolean;
    discount: boolean;
    maxDiscountPercent: number | null;
    viewStock: boolean;
    history: boolean;
}

interface LastSale {
    id: number;
    folio: string;
    code: string;
    total: number;
    cash_received: number | null;
    change: number;
}

interface Props extends PageProps {
    branch: { id: number; name: string } | null;
    nextFolio: string;
    rules: Rules;
    lastSale: LastSale | null;
}

type DiscountMode = "$" | "%";

interface CartLine {
    product: Pick<Product, "id" | "brand" | "model" | "measure" | "unit" | "price">;
    stock: number | null; // null = sin inventario cargado o sin permiso para verlo
    quantity: string;
    price: string;
    discountMode: DiscountMode;
    discount: string;
}

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const num = (v: string) => (v.trim() === "" || isNaN(Number(v)) ? 0 : Number(v));
const discountAmount = (base: number, mode: DiscountMode, value: string) =>
    round2(mode === "%" ? (base * num(value)) / 100 : num(value));

/** Billetes para cobrar rápido: el siguiente múltiplo de 50, 100, 200 y 500. */
const quickCash = (due: number) =>
    Array.from(new Set([50, 100, 200, 500].map((step) => Math.ceil(due / step) * step))).filter((v) => v > due).slice(0, 3);

const productName = (p: CartLine["product"]) => [p.brand, p.model].filter(Boolean).join(" ");

const inputCls =
    "h-9 w-full px-2.5 text-sm bg-white border rounded-input border-pebble text-charcoal tabular-nums focus:border-electric focus:ring-2 focus:ring-electric/20 disabled:bg-paper disabled:text-steel";

const Kbd = ({ children }: { children: string }) => (
    <kbd className="px-1.5 py-0.5 text-[11px] font-medium border rounded border-ash bg-paper text-steel">{children}</kbd>
);

const DiscountToggle = ({ mode, onChange, label }: { mode: DiscountMode; onChange: (m: DiscountMode) => void; label: string }) => (
    <button
        type="button"
        onClick={() => onChange(mode === "$" ? "%" : "$")}
        aria-label={`${label}: cambiar a ${mode === "$" ? "porcentaje" : "importe"}`}
        title="Cambiar entre importe y porcentaje"
        className="h-9 px-2 text-sm font-semibold border shrink-0 rounded-input border-pebble text-steel hover:bg-paper"
    >
        {mode}
    </button>
);

const CajaIndex = ({ branch, nextFolio, rules, lastSale, flash }: Props) => {
    useAlerts(flash);

    const [cart, setCart] = useState<CartLine[]>([]);
    const [customer, setCustomer] = useState("");
    const [folio, setFolio] = useState(nextFolio);
    const [noteDiscountMode, setNoteDiscountMode] = useState<DiscountMode>("$");
    const [noteDiscount, setNoteDiscount] = useState("");
    const [cashReceived, setCashReceived] = useState("");
    const [card, setCard] = useState("");
    const [transfer, setTransfer] = useState("");
    const [showOther, setShowOther] = useState(false);
    const [processing, setProcessing] = useState(false);
    const submitting = useRef(false);
    const [serverErrors, setServerErrors] = useState<Record<string, string>>({});

    const [query, setQuery] = useState("");
    const [results, setResults] = useState<Product[]>([]);
    const [highlight, setHighlight] = useState(0);
    const [searching, setSearching] = useState(false);
    const searchRef = useRef<HTMLInputElement>(null);
    const cashRef = useRef<HTMLInputElement>(null);

    const [dismissedSale, setDismissedSale] = useState<number | null>(null);
    const saleDialogOpen = !!lastSale && lastSale.id !== dismissedSale;

    const [autoPrint, setAutoPrintState] = useState(getAutoPrint);
    const printedSale = useRef<number | null>(null);
    const printSale = (id: number) => printTicket(route("tickets.show", { note: id, print: 1 }));

    // Ticket automático al cobrar (una sola vez por venta).
    useEffect(() => {
        if (lastSale && saleDialogOpen && autoPrint && printedSale.current !== lastSale.id) {
            printedSale.current = lastSale.id;
            printSale(lastSale.id);
        }
    }, [lastSale?.id]);

    // Tras cobrar, el servidor manda el siguiente folio: lo toma si no hay venta en curso.
    useEffect(() => {
        if (cart.length === 0) setFolio(nextFolio);
    }, [nextFolio]);

    // Búsqueda con espera corta: el lector de códigos y el tecleo rápido no disparan una petición por letra.
    useEffect(() => {
        const q = query.trim();
        if (q.length < 2) {
            setResults([]);
            return;
        }
        let cancelled = false;
        setSearching(true);
        const timer = setTimeout(async () => {
            try {
                const { data } = await axios.get<Product[]>("/api/products/search", {
                    params: { query: q, ...(branch ? { branch_id: branch.id } : {}) },
                });
                if (!cancelled) {
                    setResults(data.slice(0, 8));
                    setHighlight(0);
                }
            } catch {
                if (!cancelled) toast.error("No se pudo buscar. Revisa tu conexión.");
            } finally {
                if (!cancelled) setSearching(false);
            }
        }, 200);
        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [query]);

    // Atajos: F2 buscar, F8 efectivo, F12 cobrar.
    useEffect(() => {
        const onKey = (e: globalThis.KeyboardEvent) => {
            if (saleDialogOpen) return;
            if (e.key === "F2") {
                e.preventDefault();
                searchRef.current?.focus();
            } else if (e.key === "F8") {
                e.preventDefault();
                cashRef.current?.focus();
            } else if (e.key === "F12") {
                e.preventDefault();
                charge();
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    });

    const stockOf = (p: Product): number | null =>
        rules.viewStock && p.branch_counted_at && p.branch_stock !== null && p.branch_stock !== undefined ? Number(p.branch_stock) : null;

    const addProduct = (p: Product) => {
        setServerErrors({});
        setCart((current) => {
            const existing = current.findIndex((l) => l.product.id === p.id);
            if (existing >= 0) {
                return current.map((l, i) => (i === existing ? { ...l, quantity: String(num(l.quantity) + 1) } : l));
            }
            return [
                ...current,
                {
                    product: { id: p.id, brand: p.brand, model: p.model, measure: p.measure, unit: p.unit, price: p.price },
                    stock: stockOf(p),
                    quantity: "1",
                    price: String(Number(p.price)),
                    discountMode: "$",
                    discount: "",
                },
            ];
        });
        setQuery("");
        setResults([]);
        searchRef.current?.focus();
    };

    const updateLine = (index: number, patch: Partial<CartLine>) => {
        setServerErrors({});
        setCart((current) => current.map((l, i) => (i === index ? { ...l, ...patch } : l)));
    };
    const removeLine = (index: number) => {
        setServerErrors({});
        setCart((current) => current.filter((_, i) => i !== index));
    };

    const onSearchKey = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlight((h) => Math.min(h + 1, results.length - 1));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlight((h) => Math.max(h - 1, 0));
        } else if (e.key === "Enter") {
            e.preventDefault();
            if (results[highlight]) addProduct(results[highlight]);
        } else if (e.key === "Escape") {
            setQuery("");
            setResults([]);
        }
    };

    // Mismas cuentas que SaleService (el servidor vuelve a calcular y valida).
    const totals = useMemo(() => {
        const lines = cart.map((l) => {
            const gross = round2(num(l.price) * num(l.quantity));
            const discount = rules.discount ? discountAmount(gross, l.discountMode, l.discount) : 0;
            return { gross, discount, net: round2(gross - discount) };
        });
        const gross = round2(lines.reduce((a, l) => a + l.gross, 0));
        const lineDiscounts = round2(lines.reduce((a, l) => a + l.discount, 0));
        const linesNet = round2(lines.reduce((a, l) => a + l.net, 0));
        const noteDisc = rules.discount ? discountAmount(linesNet, noteDiscountMode, noteDiscount) : 0;
        const total = round2(linesNet - noteDisc);
        const totalDiscount = round2(lineDiscounts + noteDisc);
        const discountPercent = gross > 0 ? (totalDiscount / gross) * 100 : 0;
        const cashDue = round2(total - num(card) - num(transfer));
        const received = cashReceived.trim() === "" ? null : num(cashReceived);
        const change = cashDue > 0 && received !== null ? round2(received - cashDue) : 0;
        return { lines, gross, lineDiscounts, linesNet, noteDisc, total, totalDiscount, discountPercent, cashDue, received, change };
    }, [cart, noteDiscountMode, noteDiscount, card, transfer, cashReceived, rules.discount]);

    const overCap = rules.maxDiscountPercent !== null && totals.discountPercent > rules.maxDiscountPercent + 0.001;
    const lineProblem = totals.lines.some((l, i) => l.discount > l.gross || num(cart[i].quantity) < 1 || !Number.isInteger(num(cart[i].quantity)));
    const paymentProblem =
        totals.cashDue < -0.001
            ? "Tarjeta y transferencia suman más que el total."
            : totals.cashDue > 0.001 && (totals.received ?? 0) < totals.cashDue
              ? `Falta efectivo: ${formatCurrency(totals.cashDue - (totals.received ?? 0))}`
              : null;
    const blocker =
        cart.length === 0
            ? "Agrega productos para cobrar."
            : lineProblem
              ? "Revisa cantidades y descuentos."
              : totals.noteDisc > totals.linesNet
                ? "El descuento es mayor que la venta."
                : overCap
                  ? `Tu tope de descuento es ${rules.maxDiscountPercent}% (llevas ${totals.discountPercent.toFixed(1)}%).`
                  : paymentProblem;

    const resetSale = () => {
        setCart([]);
        setCustomer("");
        setNoteDiscount("");
        setNoteDiscountMode("$");
        setCashReceived("");
        setCard("");
        setTransfer("");
        setShowOther(false);
        setServerErrors({});
    };

    function charge() {
        if (blocker) {
            if (cart.length > 0) toast.warning(blocker);
            return;
        }
        if (submitting.current) return;
        submitting.current = true;
        setProcessing(true);

        router.post(
            route("caja.store"),
            {
                folio: folio.trim() || null,
                customer: customer.trim() || null,
                items: cart.map((l, i) => ({
                    product_id: l.product.id,
                    quantity: num(l.quantity),
                    ...(rules.changePrice ? { price: num(l.price) } : {}),
                    ...(rules.discount && totals.lines[i].discount > 0 ? { discount: totals.lines[i].discount } : {}),
                })),
                discount: totals.noteDisc > 0 ? totals.noteDisc : null,
                cash_received: totals.cashDue > 0 ? totals.received : null,
                card: num(card),
                transfer: num(transfer),
            },
            {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => resetSale(),
                onError: (errs) => {
                    setServerErrors(errs as Record<string, string>);
                    toast.error(Object.values(errs)[0] as string);
                },
                onFinish: () => {
                    submitting.current = false;
                    setProcessing(false);
                },
            }
        );
    }

    const closeSaleDialog = () => {
        if (lastSale) setDismissedSale(lastSale.id);
        setTimeout(() => searchRef.current?.focus(), 0);
    };

    const lineError = (i: number) => serverErrors[`items.${i}.price`] ?? serverErrors[`items.${i}.discount`] ?? serverErrors[`items.${i}.quantity`];

    return (
        <Container headTitle="Caja">
            <PageHeader
                eyebrow={branch?.name}
                title="Caja"
                description={
                    <span className="hidden sm:inline-flex items-center gap-2 text-fog">
                        <Kbd>F2</Kbd> buscar <Kbd>F8</Kbd> efectivo <Kbd>F12</Kbd> cobrar
                    </span>
                }
                actions={
                    rules.history && (
                        <Button variant="outline" color="gray" onClick={() => router.visit(route("caja.sales"))}>
                            <LuHistory />
                            Mis ventas
                        </Button>
                    )
                }
            />

            <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
                {/* Búsqueda y carrito */}
                <section className="bg-white border border-ash rounded-card">
                    <div className="relative p-3 border-b border-ash">
                        <label htmlFor="caja-search" className="sr-only">
                            Buscar producto
                        </label>
                        <LuSearch className="absolute w-5 h-5 -translate-y-1/2 pointer-events-none left-6 top-1/2 text-fog" aria-hidden />
                        <input
                            id="caja-search"
                            ref={searchRef}
                            autoFocus
                            autoComplete="off"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={onSearchKey}
                            placeholder="Buscar por marca, modelo o medida…"
                            role="combobox"
                            aria-expanded={results.length > 0}
                            aria-controls="caja-results"
                            className="w-full pl-10 pr-3 text-base bg-white border h-11 rounded-input border-pebble text-charcoal focus:border-electric focus:ring-2 focus:ring-electric/20"
                        />
                        {query.trim().length >= 2 && (
                            <div
                                id="caja-results"
                                role="listbox"
                                className="absolute z-30 overflow-hidden bg-white border shadow-lg left-3 right-3 top-full -mt-1 rounded-card border-ash"
                            >
                                {results.length === 0 ? (
                                    <div className="px-4 py-3 text-sm text-fog">{searching ? "Buscando…" : "Sin resultados"}</div>
                                ) : (
                                    results.map((p, i) => {
                                        const stock = stockOf(p);
                                        return (
                                            <button
                                                key={p.id}
                                                type="button"
                                                role="option"
                                                aria-selected={i === highlight}
                                                onMouseEnter={() => setHighlight(i)}
                                                onClick={() => addProduct(p)}
                                                className={`flex items-center w-full gap-3 px-4 py-2.5 text-left text-sm ${i === highlight ? "bg-sky-tint" : ""}`}
                                            >
                                                <span className="flex-1 min-w-0">
                                                    <span className="block font-medium truncate text-charcoal">{productName(p)}</span>
                                                    <span className="block text-xs truncate text-fog">{[p.measure, p.unit].filter(Boolean).join(" · ")}</span>
                                                </span>
                                                {rules.viewStock && (
                                                    <span className={`text-xs tabular-nums ${stock === null ? "text-fog" : stock <= 0 ? "text-red-700" : "text-steel"}`}>
                                                        {stock === null ? "sin inventario" : `${stock} disp.`}
                                                    </span>
                                                )}
                                                <span className="font-semibold tabular-nums text-charcoal">{formatCurrency(Number(p.price))}</span>
                                            </button>
                                        );
                                    })
                                )}
                            </div>
                        )}
                    </div>

                    {cart.length === 0 ? (
                        <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
                            <span className="flex items-center justify-center w-12 h-12 mb-3 rounded-tag bg-sky-tint text-electric">
                                <LuShoppingCart className="w-6 h-6" aria-hidden />
                            </span>
                            <p className="font-medium text-charcoal">Venta vacía</p>
                            <p className="mt-1 text-sm text-fog">Busca un producto y presiona Enter para agregarlo.</p>
                        </div>
                    ) : (
                        <ul className="divide-y divide-ash" aria-label="Productos de la venta">
                            <li className="hidden md:grid grid-cols-[minmax(0,1fr)_120px_104px_124px_100px_32px] gap-3 px-4 py-2 text-xs font-medium text-fog">
                                <span>Producto</span>
                                <span>Cantidad</span>
                                <span>Precio</span>
                                <span>{rules.discount ? "Descuento" : ""}</span>
                                <span className="text-right">Importe</span>
                                <span />
                            </li>
                            {cart.map((line, i) => {
                                const t = totals.lines[i];
                                const priceChanged = Math.abs(num(line.price) - Number(line.product.price)) >= 0.005;
                                const exceeds = line.stock !== null && num(line.quantity) > line.stock;
                                const error = lineError(i) ?? (t.discount > t.gross ? "El descuento es mayor que el importe." : null);
                                return (
                                    <li key={line.product.id} className="relative px-4 py-3">
                                        <div className="grid grid-cols-2 md:grid-cols-[minmax(0,1fr)_120px_104px_124px_100px_32px] gap-3 items-center">
                                            <div className="min-w-0 col-span-2 pr-8 md:col-span-1 md:pr-0">
                                                <div className="font-medium leading-snug break-words line-clamp-2 text-charcoal">{productName(line.product)}</div>
                                                <div className="text-xs truncate text-fog">
                                                    {[line.product.measure, line.product.unit].filter(Boolean).join(" · ")}
                                                    {exceeds && <span className="ml-2 font-medium text-amber-700">· sólo hay {line.stock}</span>}
                                                </div>
                                            </div>
                                            <div className="flex items-center">
                                                <IconButton
                                                    type="button"
                                                    variant="soft"
                                                    color="gray"
                                                    aria-label="Quitar uno"
                                                    onClick={() => updateLine(i, { quantity: String(Math.max(1, num(line.quantity) - 1)) })}
                                                >
                                                    <LuMinus />
                                                </IconButton>
                                                <input
                                                    aria-label={`Cantidad de ${productName(line.product)}`}
                                                    inputMode="numeric"
                                                    value={line.quantity}
                                                    onChange={(e) => updateLine(i, { quantity: e.target.value.replace(/[^\d]/g, "") })}
                                                    className={`${inputCls} mx-1 text-center !w-12 !px-1`}
                                                />
                                                <IconButton
                                                    type="button"
                                                    variant="soft"
                                                    color="gray"
                                                    aria-label="Agregar uno"
                                                    onClick={() => updateLine(i, { quantity: String(num(line.quantity) + 1) })}
                                                >
                                                    <LuPlus />
                                                </IconButton>
                                            </div>
                                            <div>
                                                {rules.changePrice ? (
                                                    <input
                                                        aria-label={`Precio de ${productName(line.product)}`}
                                                        inputMode="decimal"
                                                        value={line.price}
                                                        onChange={(e) => updateLine(i, { price: e.target.value })}
                                                        className={inputCls}
                                                    />
                                                ) : (
                                                    <span className="text-sm tabular-nums text-charcoal">{formatCurrency(num(line.price))}</span>
                                                )}
                                                {priceChanged && (
                                                    <div className="mt-0.5 text-[11px] text-fog line-through tabular-nums">{formatCurrency(Number(line.product.price))}</div>
                                                )}
                                            </div>
                                            <div className="flex gap-1">
                                                {rules.discount && (
                                                    <>
                                                        <input
                                                            aria-label={`Descuento de ${productName(line.product)}`}
                                                            inputMode="decimal"
                                                            placeholder="0"
                                                            value={line.discount}
                                                            onChange={(e) => updateLine(i, { discount: e.target.value })}
                                                            className={inputCls}
                                                        />
                                                        <DiscountToggle
                                                            label="Descuento de la partida"
                                                            mode={line.discountMode}
                                                            onChange={(m) => updateLine(i, { discountMode: m })}
                                                        />
                                                    </>
                                                )}
                                            </div>
                                            <div className="font-semibold text-right tabular-nums text-charcoal">
                                                {formatCurrency(t.net)}
                                                {t.discount > 0 && <div className="text-[11px] font-normal text-red-700">−{formatCurrency(t.discount)}</div>}
                                            </div>
                                            <div className="absolute text-right right-3 top-3 md:static">
                                                <IconButton type="button" variant="ghost" color="gray" aria-label={`Quitar ${productName(line.product)}`} onClick={() => removeLine(i)}>
                                                    <LuTrash2 />
                                                </IconButton>
                                            </div>
                                        </div>
                                        {error && <p className="mt-1.5 text-xs text-red-700">{error}</p>}
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </section>

                {/* Cobro */}
                <aside className="space-y-3 lg:sticky lg:top-4">
                    <section className="p-4 bg-white border border-ash rounded-card">
                        <div className="grid grid-cols-[96px_minmax(0,1fr)] gap-2">
                            <label className="text-xs font-medium text-steel">
                                Folio
                                <input value={folio} onChange={(e) => setFolio(e.target.value)} className={`${inputCls} mt-1`} />
                            </label>
                            <label className="text-xs font-medium text-steel">
                                Cliente
                                <input
                                    value={customer}
                                    onChange={(e) => setCustomer(e.target.value)}
                                    placeholder="Público en general"
                                    className={`${inputCls} mt-1`}
                                />
                            </label>
                        </div>

                        <dl className="mt-4 space-y-1.5 text-sm">
                            <div className="flex justify-between">
                                <dt className="text-steel">Subtotal</dt>
                                <dd className="tabular-nums text-charcoal">{formatCurrency(totals.gross)}</dd>
                            </div>
                            {totals.lineDiscounts > 0 && (
                                <div className="flex justify-between">
                                    <dt className="text-steel">Descuentos en productos</dt>
                                    <dd className="text-red-700 tabular-nums">−{formatCurrency(totals.lineDiscounts)}</dd>
                                </div>
                            )}
                        </dl>

                        {rules.discount && (
                            <div className="mt-3">
                                <label htmlFor="caja-discount" className="text-xs font-medium text-steel">
                                    Descuento a la venta
                                    {rules.maxDiscountPercent !== null && <span className="font-normal text-fog"> · tope {rules.maxDiscountPercent}%</span>}
                                </label>
                                <div className="flex gap-1 mt-1">
                                    <input
                                        id="caja-discount"
                                        inputMode="decimal"
                                        placeholder="0"
                                        value={noteDiscount}
                                        onChange={(e) => {
                                            setServerErrors({});
                                            setNoteDiscount(e.target.value);
                                        }}
                                        className={inputCls}
                                    />
                                    <DiscountToggle label="Descuento a la venta" mode={noteDiscountMode} onChange={setNoteDiscountMode} />
                                </div>
                                {totals.noteDisc > 0 && noteDiscountMode === "%" && (
                                    <p className="mt-1 text-xs text-fog">−{formatCurrency(totals.noteDisc)}</p>
                                )}
                                {(overCap || serverErrors.discount) && (
                                    <p className="mt-1 text-xs text-red-700">
                                        {serverErrors.discount ??
                                            `Tu tope es ${rules.maxDiscountPercent}%; esta venta lleva ${totals.discountPercent.toFixed(1)}%.`}
                                    </p>
                                )}
                            </div>
                        )}

                        <div className="flex items-baseline justify-between pt-3 mt-4 border-t border-ash">
                            <span className="text-sm font-medium text-steel">Total</span>
                            <span className="text-3xl font-semibold tracking-tight tabular-nums text-charcoal" data-testid="caja-total">
                                {formatCurrency(totals.total)}
                            </span>
                        </div>
                    </section>

                    <section className="p-4 bg-white border border-ash rounded-card">
                        <label htmlFor="caja-cash" className="flex items-center gap-1.5 text-xs font-medium text-steel">
                            <LuBanknote className="w-4 h-4" aria-hidden /> Efectivo recibido <span className="ml-auto"><Kbd>F8</Kbd></span>
                        </label>
                        <input
                            id="caja-cash"
                            ref={cashRef}
                            inputMode="decimal"
                            value={cashReceived}
                            onChange={(e) => setCashReceived(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && charge()}
                            placeholder={totals.cashDue > 0 ? formatCurrency(totals.cashDue) : "0"}
                            disabled={totals.cashDue <= 0}
                            className={`${inputCls} mt-1 !h-11 !text-lg`}
                        />
                        {totals.cashDue > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                                <button
                                    type="button"
                                    onClick={() => setCashReceived(String(totals.cashDue))}
                                    className="h-7 px-2.5 text-xs font-medium border rounded-button border-ash text-charcoal hover:bg-paper"
                                >
                                    Exacto
                                </button>
                                {quickCash(totals.cashDue).map((v) => (
                                    <button
                                        key={v}
                                        type="button"
                                        onClick={() => setCashReceived(String(v))}
                                        className="h-7 px-2.5 text-xs font-medium border rounded-button border-ash text-charcoal hover:bg-paper tabular-nums"
                                    >
                                        {formatCurrency(v)}
                                    </button>
                                ))}
                            </div>
                        )}

                        {showOther ? (
                            <div className="grid grid-cols-2 gap-2 mt-3">
                                <label className="text-xs font-medium text-steel">
                                    Tarjeta
                                    <input inputMode="decimal" placeholder="0" value={card} onChange={(e) => setCard(e.target.value)} className={`${inputCls} mt-1`} />
                                </label>
                                <label className="text-xs font-medium text-steel">
                                    Transferencia
                                    <input inputMode="decimal" placeholder="0" value={transfer} onChange={(e) => setTransfer(e.target.value)} className={`${inputCls} mt-1`} />
                                </label>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={() => setShowOther(true)}
                                className="inline-flex items-center gap-1.5 mt-3 text-xs font-medium text-electric hover:underline"
                            >
                                <LuCreditCard className="w-3.5 h-3.5" aria-hidden /> Tarjeta o transferencia
                            </button>
                        )}

                        <div className="flex items-baseline justify-between mt-4">
                            <span className="text-sm font-medium text-steel">Cambio</span>
                            <span
                                className={`text-2xl font-semibold tabular-nums ${totals.change > 0 ? "text-green-700" : "text-charcoal"}`}
                                data-testid="caja-change"
                            >
                                {formatCurrency(Math.max(totals.change, 0))}
                            </span>
                        </div>
                        {cart.length > 0 && blocker && <p className="mt-2 text-xs text-amber-800">{blocker}</p>}
                        {(serverErrors.cash_received || serverErrors.card) && (
                            <p className="mt-2 text-xs text-red-700">{serverErrors.cash_received ?? serverErrors.card}</p>
                        )}

                        <Button size="4" className="mt-4" style={{ width: "100%" }} disabled={!!blocker || processing} onClick={charge}>
                            {processing ? "Cobrando…" : `Cobrar ${formatCurrency(totals.total)}`}
                        </Button>
                        {cart.length > 0 && (
                            <button
                                type="button"
                                onClick={resetSale}
                                className="inline-flex items-center justify-center w-full gap-1 mt-2 text-xs font-medium text-fog hover:text-charcoal"
                            >
                                <LuX className="w-3.5 h-3.5" aria-hidden /> Cancelar venta en curso
                            </button>
                        )}
                    </section>
                </aside>
            </div>

            <Dialog.Root open={saleDialogOpen} onOpenChange={(open) => !open && closeSaleDialog()}>
                <Dialog.Content maxWidth="400px">
                    <Dialog.Title>Venta registrada</Dialog.Title>
                    <Dialog.Description size="2" color="gray">
                        Folio {lastSale?.folio} · Total {formatCurrency(lastSale?.total ?? 0)}
                    </Dialog.Description>
                    {lastSale && lastSale.cash_received !== null && (
                        <div className="p-4 mt-4 text-center rounded-card bg-mint">
                            <div className="text-sm font-medium text-green-900">Cambio</div>
                            <div className="text-4xl font-semibold tracking-tight text-green-900 tabular-nums">{formatCurrency(lastSale.change)}</div>
                            <div className="mt-1 text-xs text-green-900/70">Recibido {formatCurrency(lastSale.cash_received)}</div>
                        </div>
                    )}
                    <div className="flex flex-wrap items-center justify-between gap-2 mt-5">
                        <Text as="label" size="1" color="gray" className="inline-flex items-center gap-2">
                            <Switch
                                size="1"
                                checked={autoPrint}
                                onCheckedChange={(v) => {
                                    setAutoPrintState(v);
                                    setAutoPrint(v);
                                }}
                            />
                            Imprimir al cobrar
                        </Text>
                        <div className="flex gap-2">
                            <Button variant="outline" color="gray" onClick={() => lastSale && printSale(lastSale.id)}>
                                <LuPrinter />
                                {autoPrint ? "Reimprimir" : "Imprimir ticket"}
                            </Button>
                            <Button autoFocus onClick={closeSaleDialog}>
                                Nueva venta
                            </Button>
                        </div>
                    </div>
                </Dialog.Content>
            </Dialog.Root>
        </Container>
    );
};

export default CajaIndex;
