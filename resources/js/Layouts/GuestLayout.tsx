import ApplicationLogo from "@/Components/ApplicationLogo";
import { PageProps } from "@/types";
import { Link, usePage } from "@inertiajs/react";
import { PropsWithChildren, ReactNode } from "react";

/**
 * Pantallas de acceso: lienzo blanco con la retícula de puntos de DESIGN.md y una
 * tarjeta elevada con anillo sutil (Elevated Feature Card).
 */
export default function Guest({ children, title, description }: PropsWithChildren<{ title?: ReactNode; description?: ReactNode }>) {
    const { appVersion } = usePage<PageProps>().props;

    return (
        <div
            className="flex flex-col items-center justify-center min-h-screen px-4 py-10 bg-canvas"
            style={{
                backgroundImage: "radial-gradient(rgba(10,10,10,0.07) 1px, transparent 1px)",
                backgroundSize: "18px 18px",
            }}
        >
            <Link href="/" aria-label="Inicio" className="mb-6">
                <ApplicationLogo className="w-auto h-14 fill-current text-charcoal" />
            </Link>

            <div className="w-full max-w-sm p-8 bg-white border border-ash rounded-card-lg shadow-ring">
                {(title || description) && (
                    <div className="mb-6">
                        {title && <h1 className="text-xl font-semibold tracking-tight text-charcoal">{title}</h1>}
                        {description && <p className="mt-1 text-sm text-steel">{description}</p>}
                    </div>
                )}
                {children}
            </div>

            <p className="mt-6 text-xs text-fog">ICM Notes v{appVersion} · Ideas Modernas de Construcción</p>
        </div>
    );
}
