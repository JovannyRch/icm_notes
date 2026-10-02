import { expect, test } from "@playwright/test";

/** Caja de punta a punta como cajero: buscar con teclado, descuento con tope, cobrar con cambio y cancelar. */
test("el cajero cobra una venta con descuento y cambio", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[name="email"]', "caja-e2e@icm.test");
    await page.fill('input[name="password"]', "password");
    await page.getByRole("button", { name: "Iniciar sesión" }).click();
    await page.waitForURL("**/caja");

    const search = page.getByRole("combobox", { name: "Buscar producto" });
    await expect(search).toBeFocused();

    // Teclado: escribir y Enter agrega el primer resultado.
    await search.fill("MICHELIN");
    await expect(page.getByRole("option").first()).toContainText("MICHELIN");
    await search.press("Enter");
    await search.fill("PIRELLI");
    await page.getByRole("option", { name: /PIRELLI/ }).click();
    await page.getByRole("button", { name: "Agregar uno" }).nth(1).click();

    const total = page.getByTestId("caja-total");
    await expect(total).toHaveText("$6,100.00"); // 2500 + 2×1800

    // Sin permiso de cambiar precio: el precio es texto, no campo.
    await expect(page.getByLabel("Precio de PIRELLI P7")).toHaveCount(0);

    // Descuento por encima del tope (10%): no deja cobrar.
    await page.getByRole("button", { name: /Descuento a la venta: cambiar a porcentaje/ }).click();
    await page.fill("#caja-discount", "15");
    await expect(page.getByText(/Tu tope es 10%/)).toBeVisible();
    await expect(page.getByRole("button", { name: /^Cobrar/ })).toBeDisabled();

    await page.fill("#caja-discount", "5"); // −305
    await expect(total).toHaveText("$5,795.00");

    await page.keyboard.press("F8");
    await expect(page.locator("#caja-cash")).toBeFocused();
    await page.keyboard.type("6000");
    await expect(page.getByTestId("caja-change")).toHaveText("$205.00");

    // Al cobrar se imprime solo: el ticket se carga en un iframe oculto con ?print=1.
    const ticketRequest = page.waitForRequest((r) => /\/nota\/\d+\/ticket\?print=1/.test(r.url()));
    await page.keyboard.press("F12");
    const dialog = page.getByRole("dialog", { name: "Venta registrada" });
    await expect(dialog).toContainText("$205.00");
    const ticketUrl = (await ticketRequest).url();
    const ticket = await page.request.get(ticketUrl.replace("?print=1", ""));
    expect(await ticket.text()).toContain("$5,795.00");
    await dialog.getByRole("button", { name: "Nueva venta" }).click();
    await expect(total).toHaveText("$0.00");
    await expect(search).toBeFocused();

    // Mis ventas: aparece, y se puede cancelar (es suya y del día).
    await page.getByRole("button", { name: "Mis ventas" }).click();
    await page.waitForURL("**/caja/ventas");
    const row = page.getByRole("row", { name: /5,795\.00/ }).first();
    await expect(row).toContainText("Público en general");
    await row.getByRole("button", { name: "Cancelar" }).click();
    await page.locator(".react-confirm-alert-button-group button").first().click();
    await expect(page.getByText(/cancelada/).first()).toBeVisible();
});
