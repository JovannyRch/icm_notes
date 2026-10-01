import defaultTheme from "tailwindcss/defaultTheme";
import { readFileSync } from "node:fs";

// Colores del sistema de diseño: tokens.json (raíz) es la fuente de verdad.
// Van como hex (no var()) para que funcionen los modificadores de opacidad (ring-electric/30).
const tokens = JSON.parse(readFileSync(new URL("./tokens.json", import.meta.url), "utf8"));
const token = (name) => tokens.color[name].$value;
import forms from "@tailwindcss/forms";
const { violet, blackA, mauve, green, gray } = require("@radix-ui/colors");

/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./vendor/laravel/framework/src/Illuminate/Pagination/resources/views/*.blade.php",
        "./storage/framework/views/*.php",
        "./resources/views/**/*.blade.php",
        "./resources/js/**/*.tsx",
        "./resources/**/*.blade.php",
        "./resources/**/*.js",
        "./resources/**/*.jsx",
        "./resources/**/*.ts",
        "./resources/**/*.tsx",
        "./node_modules/react-tailwindcss-datepicker/dist/index.esm.{js,ts}",
    ],

    theme: {
        extend: {
            fontFamily: {
                sans: ["Inter Variable", "Inter", ...defaultTheme.fontFamily.sans],
                mono: ["Geist Mono", ...defaultTheme.fontFamily.mono],
            },
            // Tokens de DESIGN.md (valores en resources/css/tokens.css).
            borderRadius: {
                tag: "var(--radius-tags)",
                card: "var(--radius-cards)",
                input: "var(--radius-inputs)",
                button: "var(--radius-buttons)",
                "card-lg": "var(--radius-largecards)",
            },
            boxShadow: {
                subtle: "var(--shadow-subtle)",
                ring: "var(--shadow-subtle-2)",
                popover: "var(--shadow-md)",
            },
            colors: {
                canvas: token("canvas-white"),
                paper: token("paper-mist"),
                ash: token("ash"),
                smoke: token("smoke"),
                pebble: token("pebble"),
                ink: token("midnight-ink"),
                charcoal: token("charcoal"),
                graphite: token("graphite"),
                steel: token("steel"),
                fog: token("fog"),
                silver: token("silver"),
                electric: token("electric-blue"),
                sapphire: token("deep-sapphire"),
                mint: token("soft-mint"),
                "vivid-green": token("vivid-green"),
                tangerine: token("tangerine"),
                lavender: token("lavender"),
                // Tintes de DESIGN.md para badges y estado activo (no están en tokens.json).
                "sky-tint": "#dbeaff",
                "amber-tint": "#fef3c7",
                "rose-tint": "#fee2e2",
                ...mauve,
                ...violet,
                ...green,
                ...blackA,
                ...gray,
            },
            keyframes: {
                overlayShow: {
                    from: { opacity: "0" },
                    to: { opacity: "1" },
                },
                contentShow: {
                    from: {
                        opacity: "0",
                        transform: "translate(-50%, -48%) scale(0.96)",
                    },
                    to: {
                        opacity: "1",
                        transform: "translate(-50%, -50%) scale(1)",
                    },
                },
            },
            animation: {
                overlayShow: "overlayShow 150ms cubic-bezier(0.16, 1, 0.3, 1)",
                contentShow: "contentShow 150ms cubic-bezier(0.16, 1, 0.3, 1)",
            },
        },
    },

    plugins: [forms],
};
