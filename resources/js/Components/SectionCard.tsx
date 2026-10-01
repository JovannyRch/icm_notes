import { ReactNode } from "react";

interface Props {
    title: string;
    subtitle?: ReactNode;
    actions?: ReactNode;
    children: ReactNode;
    className?: string;
}

/** Tarjeta de sección: título, subtítulo opcional y acciones a la derecha. */
const SectionCard = ({ title, subtitle, actions, children, className = "" }: Props) => (
    <section className={`p-4 bg-white border border-ash rounded-card ${className}`}>
        <div className="flex flex-wrap items-start justify-between gap-2 mb-4">
            <div>
                <h2 className="text-[15px] font-semibold text-charcoal">{title}</h2>
                {subtitle && <p className="mt-0.5 text-xs text-fog">{subtitle}</p>}
            </div>
            {actions}
        </div>
        {children}
    </section>
);

export default SectionCard;
