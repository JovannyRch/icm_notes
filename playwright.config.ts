import { defineConfig, devices } from "@playwright/test";

/**
 * E2E contra un ambiente local con sqlite (ver tests/e2e/README.md).
 *
 * Requiere el servidor levantado con el env `e2e`:
 *   APP_ENV=e2e php artisan serve --host=127.0.0.1 --port=8001
 */
const baseURL = process.env.E2E_BASE_URL ?? "http://127.0.0.1:8001";

export default defineConfig({
    testDir: "./tests/e2e",
    globalSetup: "./tests/e2e/global-setup.ts",
    // Las pruebas comparten la misma base de datos: se corren en serie.
    fullyParallel: false,
    workers: 1,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    reporter: [["list"]],
    timeout: 60_000,
    use: {
        baseURL,
        locale: "es-MX",
        timezoneId: "America/Mexico_City",
        trace: "retain-on-failure",
        screenshot: "only-on-failure",
    },
    projects: [
        {
            name: "chromium",
            use: { ...devices["Desktop Chrome"] },
        },
    ],
});
