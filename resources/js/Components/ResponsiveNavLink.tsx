import { InertiaLinkProps, Link } from "@inertiajs/react";

export default function ResponsiveNavLink({
    active = false,
    className = "",
    children,
    ...props
}: InertiaLinkProps & { active?: boolean }) {
    return (
        <Link
            {...props}
            aria-current={active ? "page" : undefined}
            className={`flex w-full items-center gap-3 rounded-button px-3 py-2.5 text-[15px] font-medium transition-colors focus:outline-none ${
                active ? "bg-sky-tint text-electric" : "text-graphite hover:bg-paper"
            } ${className}`}
        >
            {children}
        </Link>
    );
}
