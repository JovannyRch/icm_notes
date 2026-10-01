import { expect, test } from "@playwright/test";
import { addProduct, fillPayment, login, toDisplayDate } from "./helpers";

/**
 * Red de seguridad para cambios visuales en "Crear nota": congela lo que el
 * formulario envía al servidor. Si un rediseño altera algún dato (totales,
 * partidas, pagos), esta prueba falla. La petición se intercepta y se aborta,
 * así que no se guarda nada.
 *
 * Para regenerar el snapshot a propósito: npx playwright test note-payload --update-snapshots
 */
test("crear nota envía exactamente el mismo payload", async ({ page }) => {
    await login(page);
    await page.goto("/nota/crear");

    let payload: string | null = null;
    await page.route("**/nota", async (route) => {
        if (route.request().method() === "POST") {
            payload = route.request().postData();
            await route.abort();
        } else {
            await route.continue();
        }
    });

    await page.fill('input[name="date"]', "2026-07-20");
    await page.fill('input[name="note_number"]', "E2E-PAYLOAD");
    await page.fill('input[name="customer"]', "Cliente payload");

    await addProduct(page, "MICHELIN");
    await addProduct(page, "PIRELLI");
    await page.locator('input[name="quantity"]').nth(1).fill("3");
    await page.fill('input[name="flete"]', "150");

    await fillPayment(page, 0, { cash: "1000", transfer: "250.50" });
    await page.getByRole("button", { name: "Agregar pago" }).click();
    await fillPayment(page, 1, { card: "400", date: toDisplayDate("2026-07-22") });

    await page.getByRole("button", { name: "Crear nota" }).first().click();
    await expect.poll(() => payload, { timeout: 10_000 }).not.toBeNull();

    // Orden estable de llaves para que el snapshot no dependa del orden de inserción.
    const sortKeys = (value: unknown): unknown =>
        Array.isArray(value)
            ? value.map(sortKeys)
            : value && typeof value === "object"
              ? Object.fromEntries(
                    Object.keys(value as object)
                        .sort()
                        .map((k) => [k, sortKeys((value as Record<string, unknown>)[k])])
                )
              : value;

    const body = JSON.stringify(sortKeys(JSON.parse(payload!)), null, 2);
    expect(body).toMatchSnapshot("crear-nota-payload.json");
});
