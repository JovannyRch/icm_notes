import { expect, test } from "@playwright/test";
import {
    addDays,
    addProduct,
    fillPayment,
    login,
    toDisplayDate,
} from "./helpers";

/**
 * N pagos por nota, de punta a punta: captura, cálculo de A/C y restante, y
 * atribución de cada abono al corte del día en que se cobró.
 */
test.describe("N pagos por nota", () => {
    test.beforeEach(async ({ page }) => {
        await login(page);
    });

    test("una nota nueva acepta tres pagos y calcula A/C y restante", async ({
        page,
    }) => {
        await page.goto("/nota/crear");

        const noteDate = await page.inputValue('input[name="date"]');

        await page.fill('input[name="note_number"]', "E2E-1");
        await page.fill('input[name="customer"]', "Cliente de prueba");
        await addProduct(page, "MICHELIN"); // $2,500.00

        await expect(page.getByText("$2,500.00").first()).toBeVisible();

        // Pago 1: hoy, en efectivo.
        await fillPayment(page, 0, { cash: "1000" });

        // Pago 2: transferencia dentro de tres días.
        await page.getByRole("button", { name: "Agregar pago" }).click();
        await expect(page.locator('input[name="payments.1.cash"]')).toBeVisible();
        await fillPayment(page, 1, {
            transfer: "700",
            date: toDisplayDate(addDays(noteDate, 3)),
        });

        // Pago 3: tarjeta dentro de cinco días.
        await page.getByRole("button", { name: "Agregar pago" }).click();
        await fillPayment(page, 2, {
            card: "300",
            date: toDisplayDate(addDays(noteDate, 5)),
        });

        // A/C = 1000 + 700 + 300 = 2000, restante = 2500 - 2000 = 500.
        await expect(page.getByText("$2,000.00").first()).toBeVisible();
        await expect(page.getByText("$500.00").first()).toBeVisible();

        await page.getByRole("button", { name: "Crear nota" }).click();
        await page.waitForURL(/\/nota\/\d+$/);

        // Recarga completa: así se comprueba lo que quedó guardado en el servidor
        // y no el estado que el formulario conserva tras el redirect de Inertia.
        await page.reload();

        await expect(page.locator('input[name="payments.0.cash"]')).toHaveValue(
            "1000.00"
        );
        await expect(
            page.locator('input[name="payments.1.transfer"]')
        ).toHaveValue("700.00");
        await expect(page.locator('input[name="payments.2.card"]')).toHaveValue(
            "300.00"
        );
        // El servidor recalculó A/C y restante desde los pagos.
        await expect(page.getByText("$2,000.00").first()).toBeVisible();
        await expect(page.getByText("$500.00").first()).toBeVisible();
    });

    test("un pago se puede eliminar y los totales se recalculan", async ({
        page,
    }) => {
        await page.goto("/nota/crear");

        await page.fill('input[name="note_number"]', "E2E-2");
        await addProduct(page, "PIRELLI"); // $1,800.00

        await fillPayment(page, 0, { cash: "800" });
        await page.getByRole("button", { name: "Agregar pago" }).click();
        await fillPayment(page, 1, { cash: "1000" });

        // Liquidada: A/C 1800, restante 0.
        await expect(page.getByText("$1,800.00").first()).toBeVisible();

        await page.getByRole("button", { name: "Eliminar pago 2" }).click();

        await expect(
            page.locator('input[name="payments.1.cash"]')
        ).toHaveCount(0);
        // Queda sólo el primer pago: A/C 800, restante 1000.
        await expect(page.getByText("$1,000.00").first()).toBeVisible();
    });

    test("el abono tardío entra al corte del día en que se cobró", async ({
        page,
    }) => {
        await page.goto("/nota/crear");

        // Fecha propia de esta prueba: el corte de un día suma TODAS las notas de
        // ese día, así que se aísla de las notas que crean las otras pruebas.
        const noteDate = "2026-07-15";
        const laterDate = addDays(noteDate, 4);
        await page.fill('input[name="date"]', noteDate);

        await page.fill('input[name="note_number"]', "E2E-3");
        await page.fill('input[name="customer"]', "Abono tardío");
        await addProduct(page, "GOODYEAR"); // $1,500.00

        await fillPayment(page, 0, { cash: "500" });
        await page.getByRole("button", { name: "Agregar pago" }).click();
        await fillPayment(page, 1, {
            cash: "1000",
            date: toDisplayDate(laterDate),
        });

        await page.getByRole("button", { name: "Crear nota" }).click();
        await page.waitForURL(/\/nota\/\d+$/);

        // Corte del día de la nota: sólo entra el primer abono (500).
        await page.goto(`/cortes/crear?date=${noteDate}`);
        await expect(
            page.getByRole("cell", { name: "E2E-3" }).first()
        ).toBeVisible();
        // Renglón "Efectivo:" del resumen de importes (no el de entradas anteriores).
        await expect(
            page.getByRole("row").filter({ hasText: /^Efectivo:/ })
        ).toContainText("$500.00");
        // El abono del día posterior NO se cuenta aquí.
        await expect(
            page.getByRole("row").filter({ hasText: /^Efectivo:/ })
        ).not.toContainText("$1,500.00");

        // Corte del día del segundo abono: la nota no es de ese día, así que su
        // dinero aparece en ENTRADAS ANTERIORES, ya prellenado.
        await page.goto(`/cortes/crear?date=${laterDate}`);
        await expect(page.getByText("ENTRADAS ANTERIORES")).toBeVisible();
        await expect(
            page.locator('input[value="E2E-3"]').first()
        ).toBeVisible();
        await expect(
            page.locator('input[value="1000.00"]').first()
        ).toBeVisible();
    });
});
