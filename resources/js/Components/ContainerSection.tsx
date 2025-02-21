interface ContainerSectionProps {
    title: string;
    children: React.ReactNode;
    className?: string;
}

const ContainerSection = ({
    title,
    children,
    className,
}: ContainerSectionProps) => {
    return (
        <div className={`mb-4 border border-gray-200 rounded-md border-t-0`}>
            <h2 className="p-2 text-lg font-semibold leading-tight text-white bg-gray-800 rounded-md">
                {title}
            </h2>
            <div className={`px-2 py-3  ${className ?? ""}`}>{children}</div>
        </div>
    );
};

export default ContainerSection;
