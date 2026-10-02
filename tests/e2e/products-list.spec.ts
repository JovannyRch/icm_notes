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
    // Buscar mientras se escribe.
    await page.getByLabel("Buscar productos").fill("PIRELLI");
    await expect(page).toHaveURL(/query=PIRELLI/);
    await expect(row(page, "PIRELLI")).toBeVisible();
    await expect(row(page, "MICHELIN")).toHaveCount(0);

    // Filtro de marca.
    await page.goto("/productos");
    await page.getByRole("combobox", { name: "Marca" }).click();
    await page.getByRole("option", { name: "E2EBRAND" }).click();
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

    // Filtro de estado: el producto nuevo no tiene precio.
    await page.goto("/productos?brand=E2EBRAND");
    await page.getByRole("button", { name: /Sin precio/ }).click();
    await expect(page).toHaveURL(/estado=sin_precio/);
    await expect(row(page, "BORRAR-1")).toBeVisible();

    // Ajuste masivo: se le pone costo de 100 y se sube 10% → 110.
    await page.goto("/productos?brand=E2EBRAND");
    await row(page, "BORRAR-1").getByRole("button", { name: /Editar costo/ }).click();
    await page.getByLabel("costo de E2EBRAND BORRAR-1").fill("100");
    await page.getByLabel("costo de E2EBRAND BORRAR-1").press("Enter");
    await expect(row(page, "BORRAR-1")).toContainText("$100.00");
    await page.waitForLoadState("networkidle");
    await row(page, "BORRAR-1").getByRole("checkbox").click();
    await page.getByRole("button", { name: "Ajustar precios" }).click();
    await page.getByRole("dialog").getByRole("radio", { name: "Costo" }).click();
    await page.getByLabel("Cuánto").fill("10");
    await expect(page.getByRole("dialog")).toContainText("$110.00");
    await page.getByRole("button", { name: /Cambiar 1 producto/ }).click();
    await expectToast(page, /Se actualizó el costo de 1 producto/);
    await expect(row(page, "BORRAR-1")).toContainText("$110.00");

    // Seleccionar y eliminar.
    await page.goto("/productos?brand=E2EBRAND");
    await row(page, "BORRAR-1").getByRole("checkbox").click();
    await page.getByRole("button", { name: /Eliminar selecci/ }).click();
    await page.locator(".react-confirm-alert-button-group button").first().click();
    await expectToast(page, /eliminad/i);
    await page.goto("/productos?query=BORRAR-1");
    await expect(row(page, "BORRAR-1")).toHaveCount(0);
});
