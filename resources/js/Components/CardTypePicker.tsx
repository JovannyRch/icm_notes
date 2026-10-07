/** Tipo de tarjeta del pago: crédito o débito (para cuadrar con la terminal). */
export type CardType = "credito" | "debito";

const OPTIONS: { value: CardType; label: string }[] = [
    { value: "credito", label: "Crédito" },
    { value: "debito", label: "Débito" },
];

interface Props {
    value: string | null | undefined;
    onChange: (value: CardType) => void;
    /** Marca el selector en rojo cuando falta elegir. */
    invalid?: boolean;
    label?: string;
}

const CardTypePicker = ({ value, onChange, invalid = false, label = "Tipo de tarjeta" }: Props) => (
    <div role="radiogroup" aria-label={label} className="flex items-center gap-1.5">
        {OPTIONS.map((o) => {
            const active = value === o.value;
            return (
                <button
                    key={o.value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => onChange(o.value)}
                    className={`h-7 px-2.5 text-xs font-medium border rounded-full ${
                        active
                            ? "bg-ink border-ink text-white"
                            : invalid
                              ? "bg-white border-red-400 text-red-700"
                              : "bg-white border-ash text-steel hover:border-pebble"
                    }`}
                >
                    {o.label}
                </button>
            );
        })}
    </div>
);

export default CardTypePicker;
