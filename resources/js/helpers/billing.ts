import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

/** "2026-10" -> "octubre 2026" */
export const formatPeriod = (period: string): string =>
    format(parseISO(`${period}-01`), "MMMM yyyy", { locale: es });

/** "2026-10-07" -> "7 de octubre" */
export const formatDueDate = (date: string): string =>
    format(parseISO(date), "d 'de' MMMM", { locale: es });
