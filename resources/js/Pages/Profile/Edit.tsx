import Container from "@/Components/Container";
import PageHeader from "@/Components/ui/PageHeader";
import { PageProps } from "@/types";
import UpdatePasswordForm from "./Partials/UpdatePasswordForm";
import UpdateProfileInformationForm from "./Partials/UpdateProfileInformationForm";

export default function Edit({ mustVerifyEmail, status }: PageProps<{ mustVerifyEmail: boolean; status?: string }>) {
    return (
        <Container headTitle="Perfil">
            <PageHeader title="Perfil" description="Tus datos de acceso al sistema." />

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <section className="p-6 bg-white border border-ash rounded-card">
                    <UpdateProfileInformationForm mustVerifyEmail={mustVerifyEmail} status={status} />
                </section>

                <section className="p-6 bg-white border border-ash rounded-card">
                    <UpdatePasswordForm />
                </section>
            </div>
        </Container>
    );
}
