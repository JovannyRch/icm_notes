import { expect, test } from "@playwright/test";
import { addProduct, fillPayment, login } from "./helpers";

/**
 * Red de seguridad del corte: lo que se envía al guardar (totales y snapshot) debe ser
 * exactamente igual antes y después de cualquier cambio visual. Fecha propia para no
 * mezclarse con las notas de otras pruebas.
 */
const DATE = "2026-05-18";

const sortKeys = (value: unknown): unknown =>
    Array.isArray(value)
        ? value.map(sortKeys)
        : value && typeof value === "object"
          ? Object.fromEntries(
                Object.keys(value as object)
                    .filter((k) => k !== "id") // los ids dependen del orden de las pruebas
                    .sort()
                    .map((k) => [k, sortKeys((value as Record<string, unknown>)[k])])
            )
          : value;

test("guardar el corte envía exactamente el mismo payload", async ({ page }) => {
    await login(page);

    // Dos notas del día: una pagada en efectivo y tarjeta, otra a cuenta.
    for (const [folio, cash, card] of [["E2E-CORTE-1", "2000", "500"], ["E2E-CORTE-2", "300", ""]]) {
        await page.goto("/nota/crear");
        await page.fill('input[name="date"]', DATE);
        await page.fill('input[name="note_number"]', folio);
        await addProduct(page, "MICHELIN");
        await fillPayment(page, 0, { cash, ...(card ? { card } : {}) });
        await page.getByRole("button", { name: "Crear nota" }).first().click();
        await page.waitForURL(/\/nota\/\d+$/);
    }

    await page.goto(`/cortes/crear?date=${DATE}`);
    await expect(page.getByText("E2E-CORTE-1")).toBeVisible();

    // Un gasto y una devolución, cada uno con su concepto e importe en la misma fila
    // (al escribir en la fila de captura, esa fila se queda y aparece otra vacía).
    const fillRow = async (title: string, concept: string, amount: string) => {
        const section = page.locator("section", { has: page.getByRole("heading", { name: title }) });
        await section.getByPlaceholder("Agregar concepto...").fill(concept);
        await section.locator("tbody tr").first().locator("input").nth(1).fill(amount);
    };
    await fillRow("Gastos", "Gasolina", "150");
    await fillRow("Devoluciones", "Cambio de pieza", "80");

    let payload: string | null = null;
    await page.route("**/cortes", async (route) => {
        if (route.request().method() === "POST") {
            payload = route.request().postData();
            await route.abort();
        } else {
            await route.continue();
        }
    });
    await page.getByRole("button", { name: /Guardar corte/ }).click();
    await expect.poll(() => payload, { timeout: 10_000 }).not.toBeNull();

    const body = JSON.parse(payload!);
    for (const key of ["notes", "expenses", "previous_notes", "returns"]) body[key] = JSON.parse(body[key]);
    expect(JSON.stringify(sortKeys(body), null, 2)).toMatchSnapshot("corte-payload.json");
});
