import { router } from "@inertiajs/react";
import { ReactNode } from "react";
import { LuArrowLeft } from "react-icons/lu";

interface Props {
    title: ReactNode;
    /** Texto chico sobre el título (p. ej. la sucursal). */
    eyebrow?: ReactNode;
    description?: ReactNode;
    actions?: ReactNode;
    back?: { label: string; href: string };
}

/** Encabezado común de página: regreso opcional, título Inter 24/600 y acciones a la derecha. */
const PageHeader = ({ title, eyebrow, description, actions, back }: Props) => (
    <div className="mb-6">
        {back && (
            <button
                type="button"
                onClick={() => router.visit(back.href)}
                className="inline-flex items-center gap-1.5 mb-3 -ml-1 px-1 text-[13px] font-medium rounded text-fog hover:text-charcoal focus:outline-none focus-visible:ring-2 focus-visible:ring-electric/30"
            >
                <LuArrowLeft className="w-3.5 h-3.5" aria-hidden />
                {back.label}
            </button>
        )}
        <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
            <div className="min-w-0">
                {eyebrow && <div className="text-[13px] text-fog">{eyebrow}</div>}
                <h1 className="text-2xl font-semibold tracking-tight text-charcoal">{title}</h1>
                {description && <div className="mt-1 text-sm text-steel">{description}</div>}
            </div>
            {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
    </div>
);

export default PageHeader;
