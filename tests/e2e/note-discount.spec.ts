import { expect, test } from "@playwright/test";
import { addProduct, login } from "./helpers";

/** Folio sugerido y descuento sobre el total en la nota de venta. */
test("la nota nueva sugiere folio y el descuento baja el total", async ({ page }) => {
    await login(page);
    await page.goto("/nota/crear");

    // Folio sugerido: numérico y editable (se deja el sugerido).
    const folio = await page.inputValue('input[name="note_number"]');
    expect(folio).toMatch(/^\d+$/);

    await page.fill('input[name="customer"]', "Cliente descuento");
    await addProduct(page, "MICHELIN"); // $2,500
    const total = page.getByText("Total venta:").locator("xpath=../..");
    await expect(total).toContainText("$2,500.00");

    await page.fill('input[name="discount"]', "300");
    await expect(total).toContainText("$2,200.00");

    await page.fill('input[name="discount"]', "3000");
    await expect(page.getByText("El descuento es mayor que la venta")).toBeVisible();
    await page.fill('input[name="discount"]', "300");

    await page.getByRole("button", { name: "Crear nota" }).first().click();
    await page.waitForURL(/\/nota\/\d+$/);

    // Al reabrir: mismo folio, descuento y total neto; y quién la registró.
    await expect(page.locator('input[name="note_number"]')).toHaveValue(folio);
    await expect(page.locator('input[name="discount"]')).toHaveValue(/^300(\.00?)?$/);
    await expect(total).toContainText("$2,200.00");
    await expect(page.getByText("Registró E2E Admin")).toBeVisible();
});
