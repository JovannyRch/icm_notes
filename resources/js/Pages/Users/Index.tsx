import Container from "@/Components/Container";
import StatusPill, { StatusTone } from "@/Components/StatusPill";
import PageHeader from "@/Components/ui/PageHeader";
import useAlerts from "@/hooks/useAlerts";
import { PageProps, Role } from "@/types";
import { router } from "@inertiajs/react";
import { Button, DropdownMenu, IconButton, Table } from "@radix-ui/themes";
import { confirmAlert } from "react-confirm-alert";
import { LuEllipsis, LuEye, LuPencil, LuPlus, LuPower, LuPowerOff } from "react-icons/lu";

interface UserRow {
    id: number;
    name: string;
    email: string;
    role: Role;
    active: boolean;
    branches: { id: number; name: string }[];
    is_me: boolean;
}

interface Props extends PageProps {
    users: UserRow[];
    roles: Record<Role, string>;
}

export const roleTones: Record<Role, StatusTone> = { super_admin: "violet", owner: "blue", cashier: "gray" };

const UsersIndex = ({ users, roles, flash }: Props) => {
    useAlerts(flash);

    const toggleActive = (user: UserRow) => {
        const send = () => router.patch(route("users.toggle-active", user.id), {}, { preserveScroll: true });
        if (!user.active) return send();
        confirmAlert({
            title: "Desactivar usuario",
            message: `${user.name} ya no podrá entrar al sistema y, si tiene la sesión abierta, se le cerrará. Sus ventas se conservan. Puedes reactivarlo cuando quieras.`,
            buttons: [{ label: "Desactivar", onClick: send }, { label: "Cancelar" }],
        });
    };

    const impersonate = (user: UserRow) => router.post(route("impersonation.start", user.id));

    const canImpersonate = (user: UserRow) => !user.is_me && user.active && user.role !== "super_admin";

    const branchesLabel = (user: UserRow) =>
        user.role === "cashier" ? user.branches.map((b) => b.name).join(", ") || "Sin sucursal" : "Todas";

    return (
        <Container headTitle="Usuarios">
            <PageHeader
                title="Usuarios"
                description="Quién entra al sistema, con qué rol y en qué sucursales."
                actions={
                    <Button onClick={() => router.visit(route("users.create"))}>
                        <LuPlus />
                        Nuevo usuario
                    </Button>
                }
            />

            <div className="overflow-x-auto border border-ash rounded-card">
                <Table.Root>
                    <Table.Header>
                        <Table.Row>
                            <Table.ColumnHeaderCell>Usuario</Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell>Rol</Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell>Sucursales</Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell>Estado</Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell width="48px">
                                <span className="sr-only">Acciones</span>
                            </Table.ColumnHeaderCell>
                        </Table.Row>
                    </Table.Header>
                    <Table.Body>
                        {users.map((user) => (
                            <Table.Row
                                key={user.id}
                                align="center"
                                className={`cursor-pointer ${user.active ? "" : "opacity-60"}`}
                                onClick={(e: React.MouseEvent<HTMLTableRowElement>) => {
                                    // Los clics del menú (portal) también suben por el árbol de React:
                                    // sólo cuentan los que ocurren dentro de la fila en el DOM.
                                    const target = e.target as HTMLElement;
                                    if (e.currentTarget.contains(target) && !target.closest(".clickable")) {
                                        router.visit(route("users.edit", user.id));
                                    }
                                }}
                            >
                                <Table.Cell>
                                    <div className="font-medium text-charcoal">
                                        {user.name}
                                        {user.is_me && <span className="ml-2 text-xs font-normal text-fog">(tú)</span>}
                                    </div>
                                    <div className="text-xs text-fog">{user.email}</div>
                                </Table.Cell>
                                <Table.Cell>
                                    <StatusPill tone={roleTones[user.role]}>{roles[user.role]}</StatusPill>
                                </Table.Cell>
                                <Table.Cell className="text-steel">{branchesLabel(user)}</Table.Cell>
                                <Table.Cell>
                                    {user.active ? (
                                        <StatusPill tone="green">Activo</StatusPill>
                                    ) : (
                                        <StatusPill tone="gray">Desactivado</StatusPill>
                                    )}
                                </Table.Cell>
                                <Table.Cell className="clickable">
                                    <DropdownMenu.Root>
                                        <DropdownMenu.Trigger>
                                            <IconButton variant="ghost" color="gray" aria-label={`Acciones de ${user.name}`}>
                                                <LuEllipsis />
                                            </IconButton>
                                        </DropdownMenu.Trigger>
                                        <DropdownMenu.Content align="end" variant="soft" color="gray">
                                            <DropdownMenu.Item onSelect={() => router.visit(route("users.edit", user.id))}>
                                                <LuPencil /> Editar
                                            </DropdownMenu.Item>
                                            {canImpersonate(user) && (
                                                <DropdownMenu.Item onSelect={() => impersonate(user)}>
                                                    <LuEye /> Entrar como {user.name.split(" ")[0]}
                                                </DropdownMenu.Item>
                                            )}
                                            {!user.is_me && (
                                                <>
                                                    <DropdownMenu.Separator />
                                                    <DropdownMenu.Item color={user.active ? "red" : undefined} onSelect={() => toggleActive(user)}>
                                                        {user.active ? <LuPowerOff /> : <LuPower />}
                                                        {user.active ? "Desactivar" : "Reactivar"}
                                                    </DropdownMenu.Item>
                                                </>
                                            )}
                                        </DropdownMenu.Content>
                                    </DropdownMenu.Root>
                                </Table.Cell>
                            </Table.Row>
                        ))}
                    </Table.Body>
                </Table.Root>
            </div>
        </Container>
    );
};

export default UsersIndex;
