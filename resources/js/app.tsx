import "../css/app.css";
import "./bootstrap";
import "@radix-ui/themes/styles.css";
import "react-confirm-alert/src/react-confirm-alert.css";

import { createInertiaApp } from "@inertiajs/react";
import { resolvePageComponent } from "laravel-vite-plugin/inertia-helpers";
import { createRoot } from "react-dom/client";

import { Theme } from "@radix-ui/themes";
import { ToastContainer } from "react-toastify";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "react-datepicker/dist/react-datepicker.css";

const queryClient = new QueryClient();
const appName = import.meta.env.VITE_APP_NAME || "Laravel";

createInertiaApp({
    title: (title) => `${title} - ${appName}`,
    resolve: (name) =>
        resolvePageComponent(
            `./Pages/${name}.tsx`,
            import.meta.glob("./Pages/**/*.tsx")
        ),
    setup({ el, App, props }) {
        const root = createRoot(el);

        root.render(
            <Theme>
                <QueryClientProvider client={queryClient}>
                    <App {...props} />
                    <ToastContainer />
                </QueryClientProvider>
            </Theme>
        );
    },
    progress: {
        color: "#4B5563",
    },
});
