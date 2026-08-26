import { execFileSync } from "node:child_process";

/**
 * Deja la base e2e en un estado conocido antes de correr la suite.
 * Usa el env `e2e` (.env.e2e), nunca la base de desarrollo.
 */
export default function globalSetup() {
    // E2E_APP_ENV permite apuntar la suite a otro motor (p. ej. `pgsql` con
    // .env.pgsql). Tiene que coincidir con el APP_ENV del servidor bajo prueba:
    // `artisan serve` sólo reenvía una lista blanca de variables al subproceso
    // (APP_ENV sí, DB_* no), así que la conexión se define en el archivo .env.
    const appEnv = process.env.E2E_APP_ENV ?? "e2e";
    const env = { ...process.env, APP_ENV: appEnv };

    const artisan = (args: string[]) =>
        execFileSync("php", ["artisan", ...args], {
            env,
            stdio: "pipe",
            encoding: "utf8",
        });

    artisan(["migrate:fresh", "--force"]);
    artisan(["db:seed", "--class=Database\\Seeders\\E2eSeeder", "--force"]);

    console.log(`[e2e] base de datos reiniciada con E2eSeeder (APP_ENV=${appEnv})`);
}
