import { InputHTMLAttributes } from "react";

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> {
    value: string | number;
    onChange: (value: string) => void;
    compact?: boolean;
}

/**
 * Captura de importes: "$" fijo a la izquierda y el valor tal cual se escribe
 * (no se reformatea en cada tecla). Quien lo usa limpia/convierte el texto.
 */
const MoneyInput = ({ value, onChange, compact = false, className = "", ...rest }: Props) => (
    <div className={`relative ${className}`}>
        <span className="absolute inset-y-0 flex items-center text-sm text-silver pointer-events-none left-2.5">$</span>
        <input
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={`w-full pr-2.5 text-right tabular-nums rounded-input bg-white pl-6 ${
                compact ? "py-1 text-sm" : "py-1.5"
            }`}
            {...rest}
        />
    </div>
);

export default MoneyInput;
