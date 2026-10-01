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

            {/* Lienzo blanco de 1200px (DESIGN.md): los bloques se separan con bordes, no con sombras. */}
            <div className="px-4 py-6 mx-auto max-w-[1200px] sm:px-6 text-charcoal">{children}</div>
        </AuthenticatedLayout>
    );
};

export default Container;
