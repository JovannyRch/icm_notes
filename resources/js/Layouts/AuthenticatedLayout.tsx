import ApplicationLogo from "@/Components/ApplicationLogo";
import BillingBanner from "@/Components/BillingBanner";
import { BranchSelector } from "@/Components/BranchSelector";
import NavLink from "@/Components/NavLink";
import ResponsiveNavLink from "@/Components/ResponsiveNavLink";
import { useBranch } from "@/hooks/useBranch";
import { PageProps } from "@/types";
import { Link, router, usePage } from "@inertiajs/react";
import { DropdownMenu } from "@radix-ui/themes";
import { PropsWithChildren, ReactNode, useState } from "react";
import { IconType } from "react-icons";
import {
    LuChevronDown,
    LuCreditCard,
    LuFileText,
    LuLayoutDashboard,
    LuLogOut,
    LuMenu,
    LuPackage,
    LuUser,
    LuX,
} from "react-icons/lu";
import { useLocalStorage } from "usehooks-ts";

export default function Authenticated({ header, children }: PropsWithChildren<{ header?: ReactNode }>) {
    const { auth, canManageBilling } = usePage<PageProps>().props;
    const user = auth.user;
    const [mobileOpen, setMobileOpen] = useState(false);

    const { currentBranchId } = useBranch();
    const [filterDate] = useLocalStorage(`date-filter-${currentBranchId}`, "THIS_WEEK");

    const links: { label: string; href: string; active: boolean; icon: IconType }[] = [
        { label: "Dashboard", href: route("dashboard"), active: route().current("dashboard"), icon: LuLayoutDashboard },
        { label: "Notas", href: route("notas", { date: filterDate }), active: route().current("notas"), icon: LuFileText },
        { label: "Productos", href: route("products"), active: route().current("products"), icon: LuPackage },
    ];

    const initials = user.name
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();

    return (
        <div className="min-h-screen bg-canvas">
            <BillingBanner />

            <nav className="bg-white border-b border-ash">
                <div className="flex items-center h-14 gap-4 px-4 mx-auto max-w-[1200px] sm:px-6">
                    <Link href="/" className="shrink-0" aria-label="Inicio">
                        <ApplicationLogo className="block w-auto h-8 fill-current text-charcoal" />
                    </Link>

                    <div className="items-center hidden gap-1 md:flex">
                        {links.map((link) => (
                            <NavLink key={link.label} href={link.href} active={link.active}>
                                <link.icon className="w-4 h-4" aria-hidden />
                                {link.label}
                            </NavLink>
                        ))}
                    </div>

                    <div className="items-center hidden gap-2 ml-auto md:flex">
                        <BranchSelector />
                        <DropdownMenu.Root>
                            <DropdownMenu.Trigger>
                                <button
                                    type="button"
                                    className="inline-flex items-center gap-2 h-8 pl-1 pr-2 text-sm font-medium rounded-tag text-charcoal hover:bg-paper focus:outline-none focus-visible:ring-2 focus-visible:ring-electric/30"
                                >
                                    <span className="flex items-center justify-center w-6 h-6 text-[11px] font-semibold text-white rounded-tag bg-ink">
                                        {initials}
                                    </span>
                                    <span className="hidden lg:inline max-w-[140px] truncate">{user.name}</span>
                                    <LuChevronDown className="w-3.5 h-3.5 text-fog" />
                                </button>
                            </DropdownMenu.Trigger>
                            <DropdownMenu.Content align="end" variant="soft" color="gray" sideOffset={6}>
                                <DropdownMenu.Label>{user.email}</DropdownMenu.Label>
                                <DropdownMenu.Item onSelect={() => router.visit(route("profile.edit"))}>
                                    <LuUser /> Perfil
                                </DropdownMenu.Item>
                                {canManageBilling && (
                                    <DropdownMenu.Item onSelect={() => router.visit(route("service-payments.index"))}>
                                        <LuCreditCard /> Pagos del servicio
                                    </DropdownMenu.Item>
                                )}
                                <DropdownMenu.Separator />
                                <DropdownMenu.Item onSelect={() => router.post(route("logout"))}>
                                    <LuLogOut /> Cerrar sesión
                                </DropdownMenu.Item>
                            </DropdownMenu.Content>
                        </DropdownMenu.Root>
                    </div>

                    <button
                        type="button"
                        onClick={() => setMobileOpen((open) => !open)}
                        className="inline-flex items-center justify-center w-9 h-9 ml-auto rounded-button text-graphite hover:bg-paper md:hidden"
                        aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú"}
                        aria-expanded={mobileOpen}
                    >
                        {mobileOpen ? <LuX className="w-5 h-5" /> : <LuMenu className="w-5 h-5" />}
                    </button>
                </div>

                {mobileOpen && (
                    <div className="px-4 pb-4 border-t md:hidden border-ash">
                        <div className="pt-3 space-y-1">
                            {links.map((link) => (
                                <ResponsiveNavLink key={link.label} href={link.href} active={link.active}>
                                    <link.icon className="w-4 h-4" aria-hidden />
                                    {link.label}
                                </ResponsiveNavLink>
                            ))}
                        </div>
                        <div className="pt-3 mt-3 border-t border-ash">
                            <BranchSelector fullWidth />
                        </div>
                        <div className="pt-3 mt-3 space-y-1 border-t border-ash">
                            <div className="px-3 pb-2">
                                <div className="text-sm font-medium text-charcoal">{user.name}</div>
                                <div className="text-xs text-fog">{user.email}</div>
                            </div>
                            <ResponsiveNavLink href={route("profile.edit")}>
                                <LuUser className="w-4 h-4" /> Perfil
                            </ResponsiveNavLink>
                            {canManageBilling && (
                                <ResponsiveNavLink href={route("service-payments.index")}>
                                    <LuCreditCard className="w-4 h-4" /> Pagos del servicio
                                </ResponsiveNavLink>
                            )}
                            <ResponsiveNavLink method="post" href={route("logout")} as="button">
                                <LuLogOut className="w-4 h-4" /> Cerrar sesión
                            </ResponsiveNavLink>
                        </div>
                    </div>
                )}
            </nav>

            {header && (
                <header className="border-b border-ash">
                    <div className="px-4 py-5 mx-auto max-w-[1200px] sm:px-6">{header}</div>
                </header>
            )}

            <main>{children}</main>
        </div>
    );
}
