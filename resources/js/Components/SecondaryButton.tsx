import { ButtonHTMLAttributes } from "react";

/** SecondaryButton: ver DESIGN.md (radio 8px, Inter 500, sin mayúsculas forzadas). */
export default function SecondaryButton({
    type = "button",
    className = "",
    disabled,
    children,
    ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
    return (
        <button
            {...props}
            type={type}
            className={`inline-flex items-center justify-center gap-2 h-9 px-4 text-sm font-medium rounded-button transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-electric/30 disabled:opacity-50 disabled:cursor-not-allowed bg-white text-charcoal border border-ash hover:bg-paper ${className}`}
            disabled={disabled}
        >
            {children}
        </button>
    );
}
