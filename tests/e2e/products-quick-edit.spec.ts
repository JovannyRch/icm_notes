import { expect, Page, test } from "@playwright/test";
import { login } from "./helpers";

/** Edición rápida en la lista de productos, como hoja de cálculo. */
const row = (page: Page, text: string) => page.getByRole("row", { name: new RegExp(text) });

async function createProduct(page: Page, model: string) {
    await page.goto("/productos/crear");
    await page.fill('input[name="brand"]', "QUICKEDIT");
    await page.fill('input[name="model"]', model);
    await page.fill('input[name="unit"]', "PZA");
    await page.fill('input[name="price"]', "100");
    await page.getByRole("button", { name: /Guardar producto/ }).click();
    await page.waitForURL(/\/productos\/\d+$/);
}

test("editar precio, costo y existencias desde la lista con el teclado", async ({ page }) => {
    await login(page);
    await createProduct(page, "QE-1");
    await createProduct(page, "QE-2");
    await page.goto("/productos?brand=QUICKEDIT");

    // Clic en el precio de QE-1: se edita en la misma fila.
    await row(page, "QE-1").getByRole("button", { name: /Editar precio público/ }).click();
    const price1 = page.getByLabel("precio público de QUICKEDIT QE-1");
    await expect(price1).toBeFocused();
    // Se escribe directo: el valor anterior ya viene seleccionado.
    await page.keyboard.type("149.90");
    // Enter guarda y baja al precio de la siguiente fila.
    await price1.press("Enter");
    const price2 = page.getByLabel("precio público de QUICKEDIT QE-2");
    await expect(price2).toBeFocused();
    // Tab guarda y pasa al costo de la misma fila.
    await price2.fill("210");
    await price2.press("Tab");
    const cost2 = page.getByLabel("costo de QUICKEDIT QE-2");
    await expect(cost2).toBeFocused();
    await cost2.fill("150");
    await cost2.press("Enter"); // última fila: termina la edición

    await expect(row(page, "QE-1")).toContainText("$149.90");
    await expect(row(page, "QE-2")).toContainText("$210.00");
    await expect(row(page, "QE-2")).toContainText("$150.00");

    // Esc cancela sin guardar.
    await row(page, "QE-1").getByRole("button", { name: /Editar costo/ }).click();
    await page.getByLabel("costo de QUICKEDIT QE-1").fill("999");
    await page.getByLabel("costo de QUICKEDIT QE-1").press("Escape");
    await expect(row(page, "QE-1")).not.toContainText("$999.00");

    // Existencias: de "sin inventario" a 8 piezas.
    await row(page, "QE-1").getByRole("button", { name: /Editar existencias/ }).click();
    await page.getByLabel("existencias de QUICKEDIT QE-1").fill("8");
    await page.getByLabel("existencias de QUICKEDIT QE-1").press("Enter");

    // Un número inválido no se guarda.
    await row(page, "QE-2").getByRole("button", { name: /Editar precio público/ }).click();
    await page.getByLabel("precio público de QUICKEDIT QE-2").fill("-5");
    await page.getByLabel("precio público de QUICKEDIT QE-2").press("Escape");

    // Al recargar, todo quedó guardado (y las filas no cambiaron de lugar).
    await page.reload();
    await expect(row(page, "QE-1")).toContainText("$149.90");
    await expect(row(page, "QE-1")).toContainText("8");
    await expect(row(page, "QE-2")).toContainText("$210.00");
    await expect(row(page, "QE-2")).toContainText("$150.00");
    const names = await page.locator("tbody tr").allInnerTexts();
    expect(names.findIndex((t) => t.includes("QE-1"))).toBeLessThan(names.findIndex((t) => t.includes("QE-2")));

    // Clic en otra parte de la fila sigue abriendo el producto.
    await row(page, "QE-1").getByText("QE-1").click();
    await page.waitForURL(/\/productos\/\d+$/);
});
