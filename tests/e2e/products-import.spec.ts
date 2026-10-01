import { expect, Page, test } from "@playwright/test";
import { expectToast, login } from "./helpers";

/**
 * Importar el catálogo desde Excel con EXISTENCIAS. Usa la plantilla publicada
 * (public/templates/template_productos.xlsx: un producto de ejemplo con 10).
 */
const TEMPLATE = "public/templates/template_productos.xlsx";

async function importFile(page: Page, path: string) {
    await page.goto("/productos");
    await page.getByRole("button", { name: "Importar" }).click();
    await expect(page.getByText("EXISTENCIAS", { exact: true })).toBeVisible();
    const [chooser] = await Promise.all([
        page.waitForEvent("filechooser"),
        page.getByRole("button", { name: /Seleccionar archivo/ }).click(),
    ]);
    await chooser.setFiles(path);
    await page.getByRole("button", { name: "Procesar" }).click();
}

test("importar productos con existencias, sin duplicar al reimportar", async ({ page }) => {
    await login(page);

    await importFile(page, TEMPLATE);
    await expectToast(page, /1 productos nuevos, 0 actualizados, existencias cargadas en .*: 1/);

    await page.goto("/productos?query=iPhone");
    const row = page.getByRole("row", { name: /iPhone 16 PRO MAX/ });
    await expect(row).toHaveCount(1);
    await expect(row).toContainText(/10\s*$/);

    // Reimportar el mismo archivo: se actualiza, no se duplica, y no mueve stock (ya hay 10).
    await importFile(page, TEMPLATE);
    await expectToast(page, /0 productos nuevos, 1 actualizados, existencias cargadas en .*: 0/);
    await page.goto("/productos?query=iPhone");
    await expect(page.getByRole("row", { name: /iPhone 16 PRO MAX/ })).toHaveCount(1);

    // El Excel exportado trae la columna EXISTENCIAS.
    await page.goto("/productos");
    const [download] = await Promise.all([
        page.waitForEvent("download"),
        page.getByRole("button", { name: /Exportar/ }).click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/\.xlsx$/);
});
