interface ContainerSectionProps {
    title: string;
    children: React.ReactNode;
    className?: string;
}

/** Sección con título (formularios). Tarjeta plana con borde fino, sin encabezado oscuro. */
const ContainerSection = ({ title, children, className }: ContainerSectionProps) => {
    return (
        <section className="mb-4 bg-white border border-ash rounded-card">
            <h2 className="px-4 pt-3 pb-2 text-sm font-semibold border-b text-charcoal border-ash">{title}</h2>
            <div className={`px-4 py-3 ${className ?? ""}`}>{children}</div>
        </section>
    );
};

export default ContainerSection;
