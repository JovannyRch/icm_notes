import { IconButton } from "@radix-ui/themes";
import { BsEye, BsEyeFill } from "react-icons/bs";
import { CgRemove } from "react-icons/cg";

export type Column<T> = {
    label: string;
    key: keyof T;
    type?: "text" | "number" | "date";
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

    return (
        <div className="overflow-x-auto">
            <table className="w-full border border-collapse border-gray-300">
                <thead>
                    <tr className="bg-gray-200">
                        {columns.map((column, index) => (
                            <th
                                key={index}
                                className="p-2 border border-gray-300"
                            >
                                {column.label}
                            </th>
                        ))}

                        {isEditable && (
                            <th className="p-2 border border-gray-300"></th>
                        )}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, rowIndex) => (
                        <tr key={rowIndex}>
                            {columns.map((column, colIndex) => (
                                <td
                                    key={colIndex}
                                    className="p-2 border border-gray-300"
                                >
                                    <div className="flex items-center">
                                        {onRowClick &&
                                            colIndex === 0 &&
                                            row[column.key] && (
                                                <div>
                                                    <div
                                                        className="flex justify-center w-8 bg-green-600 rounded-l-lg cursor-pointer hover:bg-green-400"
                                                        onClick={() =>
                                                            onRowClick(row)
                                                        }
                                                    >
                                                        <span className="text-xl text-white">
                                                            <BsEyeFill />
                                                        </span>
                                                    </div>
                                                </div>
                                            )}
                                        <input
                                            type={column.type || "text"}
                                            disabled={!isEditable}
                                            value={row[column.key] as string}
                                            onChange={(e) =>
                                                handleInputChange(
                                                    rowIndex,
                                                    column.key,
                                                    e.target.value as T[keyof T]
                                                )
                                            }
                                            className="w-full p-1 text-center border border-gray-300 rounded"
                                        />
                                    </div>
                                </td>
                            ))}
                            {isEditable && (
                                <td className="flex items-center justify-center p-2 border border-gray-300">
                                    <IconButton
                                        className="hover:cursor-pointer clickable"
                                        color="red"
                                        size="1"
                                        disabled={hasSingleRow}
                                        onClick={() =>
                                            setRows(
                                                rows.filter(
                                                    (r, i) => i !== rowIndex
                                                )
                                            )
                                        }
                                    >
                                        <CgRemove className="clickable" />
                                    </IconButton>
                                </td>
                            )}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default DynamicTable;
