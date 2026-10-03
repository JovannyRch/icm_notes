import { formatCurrency } from "@/helpers/formatters";
import { showsStock } from "@/helpers/utils";
import { Product } from "@/types/Product";
import axios from "axios";
import { forwardRef, KeyboardEvent, useEffect, useState } from "react";
import { LuSearch } from "react-icons/lu";
import { toast } from "react-toastify";

interface Props {
    branchId?: number;
    onPick: (product: Product) => void;
}

const name = (p: Product) => `${p.brand} ${p.model}`.trim();
const detail = (p: Product) => [p.measure, p.unit, p.mc ? `${p.mc} m²/caja` : null].filter(Boolean).join(" · ");

/**
 * Buscador fijo de productos (como el de la caja): escribir, ↑↓ y Enter agrega. Muestra
 * el costo actual y las existencias de la sucursal para saber qué se está eligiendo.
 */
const ProductSearchBox = forwardRef<HTMLInputElement, Props>(({ branchId, onPick }, ref) => {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<Product[]>([]);
    const [highlight, setHighlight] = useState(0);
    const [searching, setSearching] = useState(false);

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
                    params: { query: q, ...(branchId ? { branch_id: branchId } : {}) },
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
    }, [query, branchId]);

    const pick = (p: Product) => {
        setQuery("");
        setResults([]);
        onPick(p);
    };

    const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlight((h) => Math.min(h + 1, results.length - 1));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlight((h) => Math.max(h - 1, 0));
        } else if (e.key === "Enter") {
            e.preventDefault();
            if (results[highlight]) pick(results[highlight]);
        } else if (e.key === "Escape") {
            setQuery("");
            setResults([]);
        }
    };

    return (
        <div className="relative">
            <label htmlFor="entry-search" className="sr-only">
                Buscar producto para agregar
            </label>
            <LuSearch className="absolute w-5 h-5 -translate-y-1/2 pointer-events-none left-3 top-1/2 text-fog" aria-hidden />
            <input
                id="entry-search"
                ref={ref}
                autoFocus
                autoComplete="off"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKey}
                placeholder="Buscar producto para agregar: marca, modelo o medida…"
                role="combobox"
                aria-expanded={results.length > 0}
                aria-controls="entry-results"
                className="w-full pl-10 pr-12 text-base bg-white border h-11 rounded-input border-pebble text-charcoal focus:border-electric focus:ring-2 focus:ring-electric/20"
            />
            <kbd className="absolute hidden px-1.5 text-xs -translate-y-1/2 border rounded sm:block right-3 top-1/2 border-ash text-fog">/</kbd>
            {query.trim().length >= 2 && (
                <div id="entry-results" role="listbox" className="absolute left-0 right-0 z-30 mt-1 overflow-hidden bg-white border shadow-lg top-full rounded-card border-ash">
                    {results.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-fog">{searching ? "Buscando…" : "Sin resultados"}</div>
                    ) : (
                        results.map((p, i) => {
                            const stock = showsStock(p.branch_stock, p.branch_counted_at) ? Number(p.branch_stock ?? 0) : null;
                            return (
                                <button
                                    key={p.id}
                                    type="button"
                                    role="option"
                                    aria-selected={i === highlight}
                                    onMouseEnter={() => setHighlight(i)}
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => pick(p)}
                                    className={`flex items-center w-full gap-3 px-4 py-2.5 text-left text-sm ${i === highlight ? "bg-sky-tint" : ""}`}
                                >
                                    <span className="flex-1 min-w-0">
                                        <span className="block font-medium truncate text-charcoal">{name(p)}</span>
                                        <span className="block text-xs truncate text-fog">{detail(p)}</span>
                                    </span>
                                    <span className={`text-xs tabular-nums ${stock === null ? "text-fog" : stock <= 0 ? "text-red-700" : "text-steel"}`}>
                                        {stock === null ? "sin inventario" : `${stock} en existencia`}
                                    </span>
                                    <span className="text-right">
                                        <span className="block font-semibold tabular-nums text-charcoal">{formatCurrency(Number(p.cost ?? 0))}</span>
                                        <span className="block text-[11px] text-fog">costo</span>
                                    </span>
                                </button>
                            );
                        })
                    )}
                </div>
            )}
        </div>
    );
});

ProductSearchBox.displayName = "ProductSearchBox";

export default ProductSearchBox;
