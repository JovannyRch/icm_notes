import { expect, test } from "@playwright/test";

import { addProduct, login } from "./helpers";

/** Nota de entrada: costo, IVA y extra por producto, total al proveedor, lista y marcar pagada. */
test("nota de entrada con costos y total a pagar al proveedor", async ({ page }) => {
    await login(page);
    await page.getByRole("link", { name: "Entradas" }).first().click();
    await page.waitForURL("**/notas-entrada");
    await page.getByRole("button", { name: "Nueva nota de entrada" }).click();
    await page.waitForURL("**/nota-entrada/crear");

    await addProduct(page, "GOODYEAR");
    await page.keyboard.press("Escape");
    // Costo, IVA y extra vienen del catálogo.
    await expect(page.getByLabel("Costo de GOODYEAR ASSURANCE")).toHaveValue("1100");
    await expect(page.getByTestId("entry-total")).toHaveText("$1,100.00");

    // Llegaron 2 a un costo nuevo, con IVA: 2 × 1,200 × 1.16 = 2,784.
    await page.getByLabel("Cantidad de GOODYEAR ASSURANCE").fill("2");
    await page.getByLabel("Costo de GOODYEAR ASSURANCE").fill("1200");
    await page.getByLabel("IVA de GOODYEAR ASSURANCE").fill("16");
    await expect(page.getByTestId("entry-total")).toHaveText("$2,784.00");
    await expect(page.getByText("antes $1,100.00")).toBeVisible();
    // No tocar el catálogo (otras pruebas usan ese costo).
    await page.getByText("Guardar los costos nuevos en el catálogo").click();

    await page.getByLabel("Proveedor", { exact: true }).fill("Llantas del Centro E2E");
    await page.getByLabel("Factura o remisión").fill("F-777");
    await page.getByRole("button", { name: "Guardar nota de entrada" }).click();

    await page.waitForURL(/\/nota-entrada\/\d+$/);
    await expect(page.getByTestId("entry-total")).toHaveText("$2,784.00");
    await expect(page.getByText("Por pagar").first()).toBeVisible();
    await page.getByRole("button", { name: "Marcar pagada al proveedor" }).click();
    await expect(page.getByRole("button", { name: "Regresar a por pagar" })).toBeVisible();

    await page.getByRole("button", { name: "Notas de entrada" }).click();
    await page.getByRole("searchbox", { name: "Buscar notas de entrada" }).fill("Llantas del Centro");
    const row = page.getByRole("row", { name: /Llantas del Centro E2E/ });
    await expect(row).toContainText("$2,784.00");
    await expect(row).toContainText("Pagada");
});
