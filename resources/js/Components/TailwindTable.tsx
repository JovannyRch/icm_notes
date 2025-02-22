interface Props {
    headers: string[];
    children: React.ReactNode;
}
const TailwindTable = (props: Props) => {
    return (
        <div className="relative overflow-x-auto shadow-md sm:rounded-lg">
            <table className="w-full text-sm text-left text-gray-500 rtl:text-right ">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50 ">
                    <tr>
                        {props.headers.map((header, index) => (
                            <th
                                key={index}
                                scope="col"
                                className="p-3 text-center"
                            >
                                {header}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>{props.children}</tbody>
            </table>
        </div>
    );
};

const TailwindTableRow = ({
    children,
    onClick,
    className,
}: {
    children: React.ReactNode;
    onClick?: () => void;
    className?: string;
}) => {
    return (
        <tr
            className={`border-b border-gray-200 odd:bg-white even:bg-gray-50 ${className}`}
            onClick={onClick}
        >
            {children}
        </tr>
    );
};

const TailwindTableCell = ({ children }: { children: React.ReactNode }) => {
    return <td className="px-6 py-4 text-center">{children}</td>;
};

export { TailwindTable, TailwindTableRow, TailwindTableCell };
