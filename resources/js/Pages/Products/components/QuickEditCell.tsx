import { KeyboardEvent, ReactNode, useRef, useState } from "react";
import { LuCheck, LuLoader } from "react-icons/lu";

export type Move = "down" | "up" | "next" | "prev" | null;

interface Props {
    /** Valor actual (número) para el campo de edición. */
    value: number | null;
    /** Cómo se ve sin editar (moneda, %, "sin inventario"…). */
    display: ReactNode;
    editing: boolean;
    saving: boolean;
    saved: boolean;
    label: string;
    suffix?: string;
    onStart: () => void;
    /** Guarda (si cambió) y opcionalmente se mueve a otra celda. */
    onCommit: (raw: string, move: Move) => void;
    onCancel: () => void;
}

/** Campo en edición: se monta con el valor ya cargado, enfocado y seleccionado. */
const EditingInput = ({ value, label, suffix, onCommit, onCancel }: Pick<Props, "value" | "label" | "suffix" | "onCommit" | "onCancel">) => {
    const [draft, setDraft] = useState(value === null || value === undefined ? "" : String(Number(value)));
    const done = useRef(false);

    const finish = (move: Move) => {
        if (done.current) return;
        done.current = true;
        onCommit(draft, move);
    };

    const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            e.preventDefault();
            finish(e.shiftKey ? "up" : "down");
        } else if (e.key === "Tab") {
            e.preventDefault();
            finish(e.shiftKey ? "prev" : "next");
        } else if (e.key === "Escape") {
            e.preventDefault();
            done.current = true;
            onCancel();
        }
    };

    return (
        <span className="inline-flex items-center justify-end gap-1">
            <input
                autoFocus
                aria-label={label}
                inputMode="decimal"
                value={draft}
                onFocus={(e) => e.target.select()}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={onKeyDown}
                onBlur={() => finish(null)}
                className="w-24 h-8 px-2 text-sm text-right bg-white border tabular-nums rounded-input border-electric ring-2 ring-electric/20 text-charcoal"
            />
            {suffix && <span className="text-xs text-fog">{suffix}</span>}
        </span>
    );
};

/**
 * Celda numérica editable de la lista de productos. Funciona como hoja de cálculo:
 * clic o Enter para editar; Enter guarda y baja, Shift+Enter sube, Tab / Shift+Tab
 * pasan al campo siguiente / anterior y Esc cancela. Al salir de la celda también guarda.
 */
const QuickEditCell = ({ value, display, editing, saving, saved, label, suffix, onStart, onCommit, onCancel }: Props) => {
    if (editing) {
        return <EditingInput value={value} label={label} suffix={suffix} onCommit={onCommit} onCancel={onCancel} />;
    }

    return (
        <button
            type="button"
            onClick={onStart}
            aria-label={`Editar ${label}`}
            title="Clic para editar"
            className="inline-flex items-center justify-end gap-1.5 min-w-[64px] -mx-1.5 px-1.5 py-1 rounded-input tabular-nums text-right border border-transparent hover:border-ash hover:bg-paper focus:outline-none focus-visible:ring-2 focus-visible:ring-electric/30 cursor-text"
        >
            {saving && <LuLoader className="w-3.5 h-3.5 animate-spin text-fog" aria-hidden />}
            {saved && !saving && <LuCheck className="w-3.5 h-3.5 text-green-600" aria-label="Guardado" />}
            {display}
        </button>
    );
};

export default QuickEditCell;
