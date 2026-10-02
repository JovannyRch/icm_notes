import { expect, test } from "@playwright/test";
import { login } from "./helpers";

/** Administración de usuarios (super admin) y "entrar como" un cajero. */
test("crear un cajero, editarlo y entrar como él", async ({ page }) => {
    await login(page);
    const email = `cajero-${Date.now()}@icm.test`;

    await page.goto("/admin/usuarios");
    await page.getByRole("button", { name: "Nuevo usuario" }).click();
    await page.waitForURL("**/admin/usuarios/crear");

    await page.fill('input[name="name"]', "Cajero E2E");
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', "contra-e2e-1");
    // Rol cajero viene seleccionado; asignar una sucursal y activar descuentos.
    const branchCard = page.getByRole("checkbox", { name: "Jilotepec", exact: true });
    await page.locator("section", { hasText: "Sucursales" }).getByText("Jilotepec", { exact: true }).click();
    await page.getByRole("switch", { name: /Aplicar descuentos/ }).click();
    await page.fill('input[name="max_discount_percent"]', "15");
    await page.getByRole("button", { name: "Crear usuario" }).click();

    await page.waitForURL("**/admin/usuarios");
    const row = page.locator("tr", { hasText: email });
    await expect(row).toContainText("Cajero");
    await expect(row).toContainText("Jilotepec");

    // Clic en la fila: abre la edición con lo guardado.
    await row.getByText(email).click();
    await page.waitForURL(/\/admin\/usuarios\/\d+$/);
    await expect(page.getByRole("switch", { name: /Aplicar descuentos/ })).toBeChecked();
    await expect(page.locator('input[name="max_discount_percent"]')).toHaveValue("15");
    await expect(branchCard).toHaveAttribute("aria-checked", "true");

    // Entrar como el cajero: ve su caja y su sucursal; luego volver.
    await page.goto("/admin/usuarios");
    await page.locator("tr", { hasText: email }).getByRole("button", { name: /Acciones de/ }).click();
    await page.getByRole("menuitem", { name: /Entrar como/ }).click();
    await page.waitForURL("**/caja");
    await expect(page.getByText("Estás viendo el sistema como")).toBeVisible();
    await expect(page.getByRole("link", { name: "Notas" })).toHaveCount(0);

    await page.getByRole("button", { name: "Volver a mi cuenta" }).click();
    await page.waitForURL("**/admin/usuarios");
    await expect(page.getByText("Estás viendo el sistema como")).toHaveCount(0);
});
