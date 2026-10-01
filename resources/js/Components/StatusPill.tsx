import { ReactNode } from "react";

export type StatusTone = "green" | "amber" | "orange" | "red" | "blue" | "violet" | "gray";

const tones: Record<StatusTone, { bg: string; dot: string; text: string }> = {
    green: { bg: "bg-mint", dot: "bg-vivid-green", text: "text-green-900" },
    amber: { bg: "bg-amber-tint", dot: "bg-amber-500", text: "text-amber-900" },
    orange: { bg: "bg-orange-100", dot: "bg-tangerine", text: "text-orange-900" },
    red: { bg: "bg-rose-tint", dot: "bg-red-600", text: "text-red-900" },
    blue: { bg: "bg-sky-tint", dot: "bg-electric", text: "text-blue-900" },
    violet: { bg: "bg-violet-100", dot: "bg-lavender", text: "text-violet-900" },
    gray: { bg: "bg-paper", dot: "bg-silver", text: "text-graphite" },
};

/** Badge de estado (DESIGN.md): fondo tenue, punto de color, texto oscuro, píldora. */
const StatusPill = ({ tone, children, icon }: { tone: StatusTone; children: ReactNode; icon?: ReactNode }) => {
    const t = tones[tone];
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium leading-none rounded-tag whitespace-nowrap ${t.bg} ${t.text}`}>
            {icon ?? <span className={`w-1.5 h-1.5 rounded-tag ${t.dot}`} aria-hidden />}
            {children}
        </span>
    );
};

export default StatusPill;
