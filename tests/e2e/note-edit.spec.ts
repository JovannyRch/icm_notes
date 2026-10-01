import { expect, test } from "@playwright/test";
import { addProduct, amountNextTo, expectToast, login } from "./helpers";

/** Editar una nota existente: guardar cambios, archivar, desarchivar y eliminar. */
test("editar nota: guardar, archivar, desarchivar y eliminar", async ({ page }) => {
    await login(page);

    await page.goto("/nota/crear");
    await page.fill('input[name="date"]', "2026-06-12");
    await page.fill('input[name="note_number"]', "E2E-EDIT");
    await page.fill('input[name="customer"]', "Antes");
    await addProduct(page, "PIRELLI"); // $1,800.00
    await page.getByRole("button", { name: "Crear nota" }).first().click();
    await page.waitForURL(/\/nota\/\d+$/);
    const noteUrl = page.url();

    // Editar: cliente, cantidad y un abono; los totales se recalculan y se guardan.
    await page.fill('input[name="customer"]', "Después");
    await page.locator('input[name="quantity"]').first().fill("2");
    await page.fill('input[name="payments.0.cash"]', "1000");
    await page.getByRole("button", { name: "Guardar cambios" }).first().click();
    await page.waitForLoadState("networkidle");
    await page.goto(noteUrl);
    await expect(page.locator('input[name="customer"]')).toHaveValue("Después");
    await expect(page.locator('input[name="quantity"]').first()).toHaveValue("2");
    expect(await amountNextTo(page, "A/C:")).toBe("$1,000.00");
    expect(await amountNextTo(page, "Restante:")).toBe("$2,600.00");

    // Archivar y desarchivar desde el menú "Acciones" de la nota.
    const action = async (name: string) => {
        await page.getByRole("button", { name: "Acciones" }).click();
        await page.getByRole("menuitem", { name }).click();
    };
    await action("Archivar");
    await expectToast(page, "Nota archivada");
    await expect(page.getByText("Archivada", { exact: true })).toBeVisible();
    await action("Desarchivar");
    // El backend (NoteController@switchArchive) responde "Nota archivada" también al
    // desarchivar; aquí se verifica el estado, no el texto.
    await expect(page.getByText("Archivada", { exact: true })).toHaveCount(0);

    // Eliminar.
    await action("Eliminar");
    await page.locator(".react-confirm-alert-button-group button").first().click();
    await page.waitForURL(/\/notas/);
    await page.goto("/notas?date=ALL_TIME&query=E2E-EDIT");
    await expect(page.getByText("No se encontraron notas")).toBeVisible();
});
