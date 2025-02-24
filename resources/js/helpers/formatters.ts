import { format } from "date-fns";

export const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat("es-MX", {
        style: "currency",
        currency: "MXN",
    }).format(value);
};

export const formatDate = (date: string): string => {
    const [year, month, day] = date.split("-");

    const newDate = new Date(
        parseInt(year),
        parseInt(month) - 1,
        parseInt(day)
    );

    return format(newDate, "dd/MM/yyyy");
};

export const getToday = (): string => {
    return format(new Date(), "yyyy-MM-dd");
};
