import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head } from "@inertiajs/react";
import "@radix-ui/themes/styles.css";

interface ContainerProps {
    title?: string;
    children: React.ReactNode;
    headTitle?: string;
}

const Container = ({ title, children, headTitle }: ContainerProps) => {
    return (
        <AuthenticatedLayout
            header={
                title ? (
                    <h2 className="text-xl font-semibold leading-tight text-charcoal">
                        {title}
                    </h2>
                ) : null
            }
        >
            <Head title={headTitle ?? title} />

            {/* Lienzo blanco de 1200px (DESIGN.md): los bloques se separan con bordes, no con sombras.
                Abajo, el "section gap" de 64px para que el último bloque no quede pegado al borde. */}
            <div className="px-4 pt-6 pb-16 mx-auto max-w-[1200px] sm:px-6 sm:pb-20 text-charcoal">{children}</div>
        </AuthenticatedLayout>
    );
};

export default Container;
