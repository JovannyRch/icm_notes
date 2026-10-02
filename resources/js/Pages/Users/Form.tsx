import Container from "@/Components/Container";
import InputError from "@/Components/InputError";
import InputWithLabel from "@/Components/InputWithLabel";
import SectionCard from "@/Components/SectionCard";
import PageHeader from "@/Components/ui/PageHeader";
import useAlerts from "@/hooks/useAlerts";
import { PageProps, Role } from "@/types";
import { router, useForm } from "@inertiajs/react";
import { Button, CheckboxCards, RadioCards, Switch, Text } from "@radix-ui/themes";
import { LuRefreshCw } from "react-icons/lu";

interface Ability {
    key: string;
    label: string;
    default: boolean;
}

interface EditableUser {
    id: number;
    name: string;
    email: string;
    role: Role;
    active: boolean;
    branches: number[];
    permissions: Record<string, boolean>;
    max_discount_percent: number | null;
}

interface Props extends PageProps {
    roles: Record<Role, string>;
    abilities: Ability[];
    allBranches: { id: number; name: string }[];
    user?: EditableUser;
    isMe?: boolean;
}

const roleDescriptions: Record<Role, string> = {
    super_admin: "Todo el sistema, incluidos usuarios y pagos del servicio.",
    owner: "Toda la operación: notas, productos, inventario, cortes y dashboard.",
    cashier: "Sólo la caja, en las sucursales y con los permisos que le asignes.",
};

/** Contraseña legible para dictarla o anotarla: sin 0/O ni 1/l/I. */
const generatePassword = () => {
    const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
    const values = crypto.getRandomValues(new Uint32Array(10));
    return Array.from(values, (v) => chars[v % chars.length]).join("");
};

const UserForm = ({ roles, abilities, allBranches, user, isMe = false, flash }: Props) => {
    useAlerts(flash);
    const isEdit = !!user;

    const { data, setData, post, put, processing, errors, transform } = useForm({
        name: user?.name ?? "",
        email: user?.email ?? "",
        role: (user?.role ?? "cashier") as Role,
        active: user?.active ?? true,
        password: isEdit ? "" : generatePassword(),
        // Con una sola sucursal, el cajero nuevo ya queda asignado a ella.
        branches: (user?.branches ?? (allBranches.length === 1 ? [allBranches[0].id] : [])).map(String),
        permissions: user?.permissions ?? Object.fromEntries(abilities.map((a) => [a.key, a.default])),
        max_discount_percent: user?.max_discount_percent != null ? String(user.max_discount_percent) : "",
    });

    const isCashier = data.role === "cashier";
    const fieldErrors = errors as Record<string, string | undefined>;

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        transform((form) => ({
            ...form,
            branches: form.branches.map(Number),
            max_discount_percent: form.max_discount_percent.trim() === "" ? null : form.max_discount_percent,
        }));
        if (isEdit) put(route("users.update", user!.id), { preserveScroll: true });
        else post(route("users.store"), { preserveScroll: true });
    };

    const setPermission = (key: string, value: boolean) => setData("permissions", { ...data.permissions, [key]: value });

    return (
        <Container headTitle={isEdit ? "Editar usuario" : "Nuevo usuario"}>
            <PageHeader
                back={{ label: "Usuarios", href: route("users.index") }}
                title={isEdit ? user!.name : "Nuevo usuario"}
                description={isEdit ? user!.email : "Crea el acceso y entrégale la contraseña inicial."}
            />

            <form onSubmit={submit} className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-start">
                <div className="space-y-4">
                    <SectionCard title="Datos">
                        <div className="grid gap-3 sm:grid-cols-2">
                            <InputWithLabel
                                label="Nombre *"
                                name="name"
                                value={data.name}
                                onChange={(e) => setData("name", e.target.value)}
                                error={errors.name}
                            />
                            <InputWithLabel
                                label="Correo (para entrar) *"
                                name="email"
                                type="email"
                                value={data.email}
                                onChange={(e) => setData("email", e.target.value)}
                                error={errors.email}
                            />
                        </div>
                    </SectionCard>

                    <SectionCard
                        title="Rol"
                        subtitle={isMe ? "No puedes cambiar tu propio rol." : "Define qué partes del sistema ve."}
                    >
                        <RadioCards.Root
                            value={data.role}
                            onValueChange={(value) => setData("role", value as Role)}
                            columns="1"
                            disabled={isMe}
                        >
                            {(Object.keys(roles) as Role[]).map((role) => (
                                <RadioCards.Item key={role} value={role} className="!justify-start">
                                    <div className="text-left">
                                        <Text as="div" size="2" weight="medium">
                                            {roles[role]}
                                        </Text>
                                        <Text as="div" size="1" color="gray">
                                            {roleDescriptions[role]}
                                        </Text>
                                    </div>
                                </RadioCards.Item>
                            ))}
                        </RadioCards.Root>
                        <InputError message={errors.role} className="mt-2" />
                    </SectionCard>

                    <SectionCard
                        title="Contraseña"
                        subtitle={
                            isEdit
                                ? "Déjala vacía para conservar la actual. Escribe una nueva sólo si la olvidó."
                                : "Entrégasela al usuario; después la puede cambiar en su perfil."
                        }
                    >
                        <div className="flex items-end gap-2">
                            <InputWithLabel
                                label={isEdit ? "Nueva contraseña" : "Contraseña inicial *"}
                                name="password"
                                value={data.password}
                                onChange={(e) => setData("password", e.target.value)}
                                className="flex-1"
                            />
                            <Button type="button" variant="outline" color="gray" onClick={() => setData("password", generatePassword())}>
                                <LuRefreshCw />
                                Generar
                            </Button>
                        </div>
                        <InputError message={errors.password} className="mt-2" />
                    </SectionCard>

                    <SectionCard title="Acceso">
                        <Text as="label" size="2" className="flex items-start gap-3">
                            <Switch checked={data.active} onCheckedChange={(v) => setData("active", v)} disabled={isMe} />
                            <span>
                                <span className="block font-medium text-charcoal">Puede entrar al sistema</span>
                                <span className="block text-xs text-fog">
                                    {isMe
                                        ? "No puedes desactivar tu propia cuenta."
                                        : "Desactívalo en lugar de borrarlo: sus ventas se conservan."}
                                </span>
                            </span>
                        </Text>
                    </SectionCard>
                </div>

                <div className="space-y-4">
                    {isCashier ? (
                        <>
                            <SectionCard title="Sucursales" subtitle="El cajero sólo vende y ve datos de estas sucursales.">
                                <CheckboxCards.Root
                                    value={data.branches}
                                    onValueChange={(value) => setData("branches", value)}
                                    columns={{ initial: "1", sm: "2" }}
                                >
                                    {allBranches.map((branch) => (
                                        <CheckboxCards.Item key={branch.id} value={String(branch.id)}>
                                            {branch.name}
                                        </CheckboxCards.Item>
                                    ))}
                                </CheckboxCards.Root>
                                <InputError message={errors.branches ?? fieldErrors["branches.0"]} className="mt-2" />
                            </SectionCard>

                            <SectionCard title="Permisos de caja" subtitle="Nunca ve costos, cortes, inventario ni el dashboard.">
                                <ul className="divide-y divide-ash">
                                    {abilities.map((ability) => (
                                        <li key={ability.key} className="py-2.5 first:pt-0 last:pb-0">
                                            <Text as="label" size="2" className="flex items-center justify-between gap-4">
                                                <span className="text-charcoal">{ability.label}</span>
                                                <Switch
                                                    checked={!!data.permissions[ability.key]}
                                                    onCheckedChange={(v) => setPermission(ability.key, v)}
                                                />
                                            </Text>
                                            {ability.key === "sales.discount" && data.permissions[ability.key] && (
                                                <div className="mt-2 ml-0 sm:max-w-[220px]">
                                                    <InputWithLabel
                                                        label="Tope de descuento (%)"
                                                        name="max_discount_percent"
                                                        type="number"
                                                        value={data.max_discount_percent}
                                                        onChange={(e) => setData("max_discount_percent", e.target.value)}
                                                        error={errors.max_discount_percent}
                                                    />
                                                    <p className="mt-1 text-xs text-fog">Vacío: sin tope.</p>
                                                </div>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </SectionCard>
                        </>
                    ) : (
                        <SectionCard title="Sucursales y permisos">
                            <p className="text-sm text-steel">
                                {roles[data.role]}: trabaja en todas las sucursales ({allBranches.map((b) => b.name).join(", ")}) y tiene
                                todos los permisos de su rol. Las sucursales y permisos se configuran sólo para cajeros.
                            </p>
                        </SectionCard>
                    )}
                </div>

                <div className="flex justify-end gap-2 lg:col-span-2">
                    <Button type="button" variant="soft" color="gray" onClick={() => router.visit(route("users.index"))}>
                        Cancelar
                    </Button>
                    <Button type="submit" disabled={processing}>
                        {processing ? "Guardando…" : isEdit ? "Guardar cambios" : "Crear usuario"}
                    </Button>
                </div>
            </form>
        </Container>
    );
};

export default UserForm;
