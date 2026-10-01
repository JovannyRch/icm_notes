import { expect, Page, test } from "@playwright/test";
import { expectToast, login } from "./helpers";

/** Listado de productos: buscar, filtrar por marca, abrir, exportar y eliminar seleccionados. */
const row = (page: Page, text: string) => page.getByRole("row", { name: new RegExp(text) });

test("productos: buscar, filtrar por marca, abrir, exportar y eliminar", async ({ page }) => {
    await login(page);

    // Producto propio para poder borrarlo sin afectar a otras pruebas.
    await page.goto("/productos/crear");
    await page.fill('input[name="brand"]', "E2EBRAND");
    await page.fill('input[name="model"]', "BORRAR-1");
    await page.fill('input[name="unit"]', "PZA");
    await page.getByRole("button", { name: /Guardar producto/ }).click();
    await page.waitForURL(/\/productos\/\d+$/);

    await page.goto("/productos");
    await expect(row(page, "MICHELIN")).toBeVisible();

    // Buscar.
    await page.getByPlaceholder("Buscar producto...").fill("PIRELLI");
    await page.getByRole("button", { name: "Buscar" }).click();
    await expect(page).toHaveURL(/query=PIRELLI/);
    await expect(row(page, "PIRELLI")).toBeVisible();
    await expect(row(page, "MICHELIN")).toHaveCount(0);

    // Filtro de marca.
    await page.goto("/productos");
    await page.getByRole("button", { name: /Marca/ }).click();
    await page.getByRole("menuitem", { name: "E2EBRAND" }).click();
    await expect(page).toHaveURL(/brand=E2EBRAND/);
    await expect(row(page, "BORRAR-1")).toBeVisible();
    await expect(row(page, "MICHELIN")).toHaveCount(0);

    // Exportar descarga un Excel.
    const [download] = await Promise.all([
        page.waitForEvent("download", { timeout: 15_000 }),
        page.getByRole("button", { name: /Exportar/ }).click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/\.xlsx$/);

    // Abrir producto con clic en la fila.
    await page.goto("/productos?brand=E2EBRAND");
    await row(page, "BORRAR-1").getByText("BORRAR-1").click();
    await page.waitForURL(/\/productos\/\d+$/);

    // Seleccionar y eliminar.
    await page.goto("/productos?brand=E2EBRAND");
    await row(page, "BORRAR-1").getByRole("checkbox").click();
    await page.getByRole("button", { name: /Eliminar selecci/ }).click();
    await page.locator(".react-confirm-alert-button-group button").first().click();
    await expectToast(page, /eliminad/i);
    await page.goto("/productos?query=BORRAR-1");
    await expect(row(page, "BORRAR-1")).toHaveCount(0);
});
