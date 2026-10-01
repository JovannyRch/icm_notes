import { formatCurrency } from "@/helpers/formatters";
import { isNumber } from "@/helpers/utils";
import { IconButton } from "@radix-ui/themes";
import { BsEyeFill } from "react-icons/bs";
import { TbTrash } from "react-icons/tb";

export type Column<T> = {
    label: string;
    key: keyof T;
    type?: "text" | "number" | "date";
    /** Importe: alineado a la derecha, teclado decimal, "$" en solo lectura. */
    money?: boolean;
    placeholder?: string;
};

type DynamicTableProps<T> = {
    columns: Column<T>[];
    rows: T[];
    setRows: (rows: T[]) => void;
    isEditable?: boolean;
    onRowClick?: (row: T) => void;
};

const DynamicTable = <T extends Record<string, any>>({
    columns,
    rows,
    setRows,
    isEditable = true,
    onRowClick,
}: DynamicTableProps<T>) => {
    // Manejo del cambio en los inputs
    const handleInputChange = (
        rowIndex: number,
        columnKey: keyof T,
        value: T[keyof T]
    ) => {
        const updatedRows = [...rows];
        updatedRows[rowIndex] = {
            ...updatedRows[rowIndex],
            [columnKey]: value,
        };
        setRows(updatedRows);

        const isLastRow = rowIndex === rows.length - 1;
        const isNotEmpty = Object.values(updatedRows[rowIndex]).some(
            (val) => val !== ""
        );

        if (isLastRow && isNotEmpty) {
            setRows([...updatedRows, createEmptyRow(columns)]);
        }
    };

    // Función para crear una fila vacía basada en el tipo T
    function createEmptyRow(columns: Column<T>[]): T {
        return columns.reduce((acc, column) => {
            acc[column.key] = "" as T[keyof T];
            return acc;
        }, {} as T);
    }

    const totalRows = rows.length;

    const hasSingleRow = totalRows === 1;

    const displayValue = (column: Column<T>, value: unknown) => {
        if (value === "" || value === null || value === undefined) return "-";
        if (column.money) return isNumber(value) ? formatCurrency(Number(value)) : String(value);
        return String(value);
    };

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="text-xs text-left text-fog uppercase border-b border-ash">
                        {columns.map((column, index) => (
                            <th
                                key={index}
                                className={`py-2 pr-3 font-medium ${column.money ? "text-right" : ""}`}
                            >
                                {column.label}
                            </th>
                        ))}

                        {isEditable && <th className="w-10 py-2" aria-label="Acciones"></th>}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, rowIndex) => {
                        // La última fila editable es la de captura: se ve como "nueva fila".
                        const isCaptureRow = isEditable && rowIndex === totalRows - 1;
                        return (
                            <tr key={rowIndex} className="border-b border-ash/70">
                                {columns.map((column, colIndex) => (
                                    <td key={colIndex} className="py-1.5 pr-3">
                                        <div className="flex items-center gap-1.5">
                                            {onRowClick && colIndex === 0 && row[column.key] && (
                                                <button
                                                    type="button"
                                                    title="Abrir nota"
                                                    className="flex items-center justify-center bg-white border shrink-0 w-7 h-7 rounded-button border-ash text-steel hover:text-electric hover:bg-paper"
                                                    onClick={() => onRowClick(row)}
                                                >
                                                    <BsEyeFill />
                                                </button>
                                            )}
                                            {isEditable ? (
                                                <input
                                                    type={column.type || "text"}
                                                    inputMode={column.money ? "decimal" : undefined}
                                                    value={row[column.key] as string}
                                                    placeholder={isCaptureRow ? column.placeholder : undefined}
                                                    onChange={(e) =>
                                                        handleInputChange(rowIndex, column.key, e.target.value as T[keyof T])
                                                    }
                                                    className={`w-full px-2 py-1 text-sm rounded-input bg-white ${
                                                        column.money ? "text-right tabular-nums" : ""
                                                    } ${isCaptureRow ? "bg-paper border-dashed" : ""}`}
                                                />
                                            ) : (
                                                <span className={`w-full py-1 ${column.money ? "text-right tabular-nums" : ""}`}>
                                                    {displayValue(column, row[column.key])}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                ))}
                                {isEditable && (
                                    <td className="py-1.5 text-center">
                                        <IconButton
                                            type="button"
                                            className="hover:cursor-pointer"
                                            color="red"
                                            variant="ghost"
                                            size="1"
                                            aria-label="Quitar fila"
                                            disabled={hasSingleRow || isCaptureRow}
                                            onClick={() => setRows(rows.filter((r, i) => i !== rowIndex))}
                                        >
                                            <TbTrash />
                                        </IconButton>
                                    </td>
                                )}
                            </tr>
                        );
                    })}
                    {!isEditable && rows.length === 0 && (
                        <tr>
                            <td colSpan={columns.length} className="py-4 text-center text-silver">
                                Sin registros
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};

export default DynamicTable;
