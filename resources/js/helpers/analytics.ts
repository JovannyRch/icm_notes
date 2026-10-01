import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

/** Paleta categórica validada (dataviz): orden fijo, nunca ciclado. */
export const SERIES = {
    blue: "#2a78d6",
    orange: "#eb6834",
    aqua: "#1baf7a",
};

/** Rampa ordinal azul (de claro a oscuro) para buckets ordenados. */
export const ORDINAL_BLUE = ["#86b6ef", "#5598e7", "#256abf", "#104281"];

export const CHART = {
    grid: "#e1e0d9",
    axis: "#c3c2b7",
    muted: "#898781",
    textSecondary: "#52514e",
};

/** "2026-09-05" -> "5 sep"; "2026-09" -> "sep 26" */
export const formatBucket = (key: string): string =>
    key.length === 7
        ? format(parseISO(`${key}-01`), "MMM yy", { locale: es })
        : format(parseISO(key), "d MMM", { locale: es });

/** "2026-09-05" -> "viernes 5 de septiembre"; "2026-09" -> "septiembre 2026" */
export const formatBucketLong = (key: string): string => {
    const text =
        key.length === 7
            ? format(parseISO(`${key}-01`), "MMMM yyyy", { locale: es })
            : format(parseISO(key), "EEEE d 'de' MMMM", { locale: es });
    return text.charAt(0).toUpperCase() + text.slice(1);
};

/** Moneda compacta para ejes: 12500 -> "$12.5k" */
export const formatCompactCurrency = (value: number): string =>
    "$" +
    new Intl.NumberFormat("es-MX", {
        notation: "compact",
        maximumFractionDigits: 1,
    }).format(value);

export const formatNumber = (value: number, digits = 0): string =>
    new Intl.NumberFormat("es-MX", {
        maximumFractionDigits: digits,
    }).format(value);

/** Variación porcentual; null si no hay base para comparar. */
export const percentChange = (
    current: number | null,
    previous: number | null
): number | null => {
    if (current === null || previous === null || previous === 0) return null;
    return ((current - previous) / Math.abs(previous)) * 100;
};

/** Máximo "bonito" para el eje Y y sus marcas. */
export const niceScale = (max: number, ticks = 4): number[] => {
    if (max <= 0) return [0, 1];
    const raw = max / ticks;
    const pow = Math.pow(10, Math.floor(Math.log10(raw)));
    const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= raw)!;
    return Array.from({ length: ticks + 1 }, (_, i) => i * step);
};
