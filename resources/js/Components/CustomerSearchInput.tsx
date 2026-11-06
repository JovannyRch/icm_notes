import { CustomerMatch } from "@/types/Customer";
import axios from "axios";
import { KeyboardEvent, useEffect, useState } from "react";

interface Props {
    id?: string;
    /** Para que el campo siga enviándose con useForm/transform como cualquier input normal. */
    name?: string;
    /** `customer` es una columna nullable en el backend: null se trata como vacío. */
    value: string | null;
    onChange: (value: string) => void;
    /** Se eligió un cliente ya capturado: el llamador decide qué hacer con sus datos. */
    onPick: (customer: CustomerMatch) => void;
    placeholder?: string;
    className?: string;
    autoFocus?: boolean;
}

const subtitle = (c: CustomerMatch) => [c.customer_phone, c.customer_address].filter(Boolean).join(" · ") || "Sin teléfono ni dirección";

/**
 * Campo de nombre de cliente con sugerencias de clientes ya capturados antes (en caja o en
 * notas), para no volver a escribir teléfono y dirección. No hay tabla de clientes: busca
 * en las notas existentes (`/api/customers/search`). Escribir un nombre nuevo sigue
 * funcionando igual que un campo de texto normal; elegir una sugerencia sólo rellena los
 * otros campos, nunca bloquea capturar un cliente que no existía.
 */
const CustomerSearchInput = ({ id, name, value, onChange, onPick, placeholder, className, autoFocus }: Props) => {
    const [results, setResults] = useState<CustomerMatch[]>([]);
    const [highlight, setHighlight] = useState(0);
    const [open, setOpen] = useState(false);
    const [searching, setSearching] = useState(false);

    useEffect(() => {
        // Defensivo: `customer` es una columna nullable y alguna nota puede llegar sin capturarlo.
        const q = String(value ?? "").trim();
        if (q.length < 2) {
            setResults([]);
            return;
        }
        let cancelled = false;
        setSearching(true);
        const timer = setTimeout(async () => {
            try {
                const { data } = await axios.get<CustomerMatch[]>("/api/customers/search", { params: { query: q } });
                if (!cancelled) {
                    setResults(data);
                    setHighlight(0);
                }
            } catch {
                // Silencioso: si falla la búsqueda, el cliente se sigue pudiendo escribir a mano.
            } finally {
                if (!cancelled) setSearching(false);
            }
        }, 250);
        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [value]);

    const pick = (c: CustomerMatch) => {
        onPick(c);
        setResults([]);
        setOpen(false);
    };

    const showDropdown = open && String(value ?? "").trim().length >= 2 && (results.length > 0 || searching);

    const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (!showDropdown || results.length === 0) return;
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlight((h) => Math.min(h + 1, results.length - 1));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlight((h) => Math.max(h - 1, 0));
        } else if (e.key === "Enter") {
            if (results[highlight]) {
                e.preventDefault();
                pick(results[highlight]);
            }
        } else if (e.key === "Escape") {
            setOpen(false);
        }
    };

    const listId = id ? `${id}-options` : undefined;

    return (
        <div className="relative">
            <input
                id={id}
                name={name}
                value={value ?? ""}
                autoFocus={autoFocus}
                autoComplete="off"
                placeholder={placeholder}
                onChange={(e) => {
                    onChange(e.target.value);
                    setOpen(true);
                }}
                onFocus={() => setOpen(true)}
                // El timeout deja que el click en una opción (onMouseDown) registre antes de cerrar.
                onBlur={() => setTimeout(() => setOpen(false), 120)}
                onKeyDown={onKeyDown}
                role="combobox"
                aria-expanded={showDropdown}
                aria-controls={listId}
                aria-autocomplete="list"
                className={className}
            />
            {showDropdown && (
                <div
                    id={listId}
                    role="listbox"
                    className="absolute left-0 right-0 z-30 mt-1 overflow-hidden overflow-y-auto bg-white border shadow-lg top-full rounded-card border-ash max-h-60"
                >
                    {results.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-fog">Buscando…</div>
                    ) : (
                        results.map((c, i) => (
                            <button
                                key={`${c.customer}-${c.customer_phone ?? ""}-${i}`}
                                type="button"
                                role="option"
                                aria-selected={i === highlight}
                                onMouseEnter={() => setHighlight(i)}
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => pick(c)}
                                className={`block w-full px-3 py-2 text-left text-sm ${i === highlight ? "bg-sky-tint" : ""}`}
                            >
                                <span className="block font-medium truncate text-charcoal">{c.customer}</span>
                                <span className="block text-xs truncate text-fog">{subtitle(c)}</span>
                            </button>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

export default CustomerSearchInput;
