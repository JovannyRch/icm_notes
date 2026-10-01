import InputError from "@/Components/InputError";
import InputLabel from "@/Components/InputLabel";
import PrimaryButton from "@/Components/PrimaryButton";
import TextInput from "@/Components/TextInput";
import { Transition } from "@headlessui/react";
import { Link, useForm, usePage } from "@inertiajs/react";
import { FormEventHandler } from "react";

export default function UpdateProfileInformation({
    mustVerifyEmail,
    status,
    className = "",
}: {
    mustVerifyEmail: boolean;
    status?: string;
    className?: string;
}) {
    const user = usePage().props.auth.user;

    const { data, setData, patch, errors, processing, recentlySuccessful } =
        useForm({
            name: user.name,
            email: user.email,
        });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        patch(route("profile.update"));
    };

    return (
        <section className={className}>
            <header>
                <h2 className="text-[15px] font-semibold text-charcoal">
                    Información del perfil
                </h2>

                {/*    <p className="mt-1 text-sm text-gray-600">
                    Update your account's profile information and email address.
                </p> */}
            </header>

            <form onSubmit={submit} className="mt-6 space-y-6">
                <div>
                    <InputLabel htmlFor="name" value="Nombre" />

                    <TextInput
                        id="name"
                        className="block w-full mt-1"
                        value={data.name}
                        onChange={(e) => setData("name", e.target.value)}
                        required
                        isFocused
                        autoComplete="name"
                    />

                    <InputError className="mt-2" message={errors.name} />
                </div>

                <div>
                    <InputLabel htmlFor="email" value="Correo electrónico" />

                    <TextInput
                        id="email"
                        type="email"
                        className="block w-full h-9 bg-paper text-steel"
                        readOnly
                        value={data.email}
                        onChange={(e) => setData("email", e.target.value)}
                        required
                        disabled
                        autoComplete="username"
                    />

                    {/* Nota informativa, no un error: el correo no es editable desde aquí. */}
                    <p className="mt-1.5 text-xs text-fog">
                        No puedes cambiar tu correo electrónico. Si necesitas hacerlo, contacta a soporte.
                    </p>
                </div>

                <div className="flex items-center gap-4">
                    <PrimaryButton disabled={processing}>Guardar</PrimaryButton>

                    <Transition
                        show={recentlySuccessful}
                        enter="transition ease-in-out"
                        enterFrom="opacity-0"
                        leave="transition ease-in-out"
                        leaveTo="opacity-0"
                    >
                        <p className="text-sm text-vivid-green">
                            Cambios guardados.
                        </p>
                    </Transition>
                </div>
            </form>
        </section>
    );
}
