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
                    <h2 className="text-xl font-semibold leading-tight text-gray-800">
                        {title}
                    </h2>
                ) : null
            }
        >
            <Head title={headTitle ?? title} />

            <div className="p-2">
                <div className="mx-auto">
                    <div className="overflow-hidden bg-white shadow-sm sm:rounded-lg">
                        <div className="p-6 text-gray-900">{children}</div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
};

export default Container;
