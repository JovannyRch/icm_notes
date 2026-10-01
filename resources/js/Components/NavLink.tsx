import { InertiaLinkProps, Link } from "@inertiajs/react";

/** Item de navegación: botón fantasma en píldora; activo con tinte azul (DESIGN.md). */
export default function NavLink({
    active = false,
    className = "",
    children,
    ...props
}: InertiaLinkProps & { active: boolean }) {
    return (
        <Link
            {...props}
            aria-current={active ? "page" : undefined}
            className={`inline-flex items-center gap-2 px-3 h-8 rounded-tag text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-electric/30 ${
                active ? "bg-sky-tint text-electric" : "text-steel hover:text-charcoal hover:bg-paper"
            } ${className}`}
        >
            {children}
        </Link>
    );
}
