import { expect, test } from "@playwright/test";
import { addProduct, login } from "./helpers";

/** Nota de venta: folio sugerido, datos de contacto del cliente y descuentos apagados. */
test("la nota nueva sugiere folio y guarda teléfono y dirección del cliente", async ({ page }) => {
    await login(page);
    await page.goto("/nota/crear");

    const folio = await page.inputValue('input[name="note_number"]');
    expect(folio).toMatch(/^\d+$/);

    // Descuentos apagados por ahora: la nota no muestra el campo.
    await expect(page.locator('input[name="discount"]')).toHaveCount(0);

    await page.fill('input[name="customer"]', "Cliente Contacto");
    await page.fill('input[name="customer_phone"]', "712 444 5566");
    await page.fill('input[name="customer_address"]', "Av. Hidalgo 45, Centro");
    await addProduct(page, "MICHELIN");

    await page.getByRole("button", { name: "Crear nota" }).first().click();
    await page.waitForURL(/\/nota\/\d+$/);

    await expect(page.locator('input[name="note_number"]')).toHaveValue(folio);
    await expect(page.locator('input[name="customer_phone"]')).toHaveValue("712 444 5566");
    await expect(page.locator('input[name="customer_address"]')).toHaveValue("Av. Hidalgo 45, Centro");
    await expect(page.getByText("Registró E2E Admin")).toBeVisible();
});
