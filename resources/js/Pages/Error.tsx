import ApplicationLogo from "@/Components/ApplicationLogo";
import { Head } from "@inertiajs/react";
import { Button } from "@radix-ui/themes";
import { IconType } from "react-icons";
import { LuArrowLeft, LuFileQuestion, LuHouse, LuLock, LuTriangleAlert, LuWrench } from "react-icons/lu";

interface Props {
    status: number;
    /** Mensaje propio del abort (p. ej. "No tienes acceso a esa sucursal."). */
    message?: string | null;
    appVersion?: string;
}

const PAGES: Record<number, { title: string; description: string; icon: IconType }> = {
    404: {
        title: "No encontramos esta página",
        description: "Puede que el enlace esté mal escrito, o que la nota o el producto que buscas se haya eliminado.",
        icon: LuFileQuestion,
    },
    403: {
        title: "No tienes permiso para ver esto",
        description: "Tu usuario no tiene acceso a esta pantalla. Si lo necesitas, pídele al administrador que te dé el permiso.",
        icon: LuLock,
    },
    500: {
        title: "Algo salió mal",
        description: "Ocurrió un error en el sistema. Vuelve a intentarlo y, si sigue pasando, avisa al administrador.",
        icon: LuTriangleAlert,
    },
    503: {
        title: "Estamos en mantenimiento",
        description: "El sistema vuelve en unos minutos. Intenta de nuevo en un momento.",
        icon: LuWrench,
    },
};

/**
 * Pantalla de error (bootstrap/app.php → withExceptions). No usa el layout con menú ni
 * props compartidos: en una URL que no existe no corre la sesión, así que no sabe quién es
 * el usuario. "Ir al inicio" lleva a "/", que manda al panel o al login.
 */
export default function Error({ status, message, appVersion }: Props) {
    const page = PAGES[status] ?? PAGES[500];
    const Icon = page.icon;
    const canGoBack = typeof window !== "undefined" && window.history.length > 1;

    return (
        <div
            className="flex flex-col items-center justify-center min-h-screen px-4 py-10 bg-canvas"
            style={{ backgroundImage: "radial-gradient(rgba(10,10,10,0.07) 1px, transparent 1px)", backgroundSize: "18px 18px" }}
        >
            <Head title={page.title} />

            <a href="/" aria-label="Inicio" className="mb-6">
                <ApplicationLogo className="w-auto h-12 fill-current text-charcoal" />
            </a>

            <main className="w-full max-w-md p-8 text-center bg-white border border-ash rounded-card-lg shadow-ring">
                <span className="inline-flex items-center justify-center w-12 h-12 mb-4 rounded-full bg-sky-tint text-electric">
                    <Icon className="w-6 h-6" aria-hidden />
                </span>
                <p className="text-xs font-semibold tracking-widest uppercase text-fog">Error {status}</p>
                <h1 className="mt-1 text-2xl font-semibold tracking-tight text-charcoal">{page.title}</h1>
                <p className="mt-2 text-sm text-steel">{message || page.description}</p>

                <div className="flex flex-col-reverse justify-center gap-2 mt-6 sm:flex-row">
                    {canGoBack && (
                        <Button size="3" variant="outline" color="gray" onClick={() => window.history.back()}>
                            <LuArrowLeft /> Regresar
                        </Button>
                    )}
                    <Button size="3" asChild>
                        <a href="/">
                            <LuHouse /> Ir al inicio
                        </a>
                    </Button>
                </div>
            </main>

            <p className="mt-6 text-xs text-fog">ICM Notes{appVersion ? ` v${appVersion}` : ""} · Ideas Modernas de Construcción</p>
        </div>
    );
}
