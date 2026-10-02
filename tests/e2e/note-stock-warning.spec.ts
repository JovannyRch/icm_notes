import { expect, test } from "@playwright/test";
import { addProduct, login } from "./helpers";

/**
 * Aviso de existencias en la nota: informativo, no impide guardar. Al editar, las
 * piezas que la nota ya tiene guardadas cuentan como disponibles para ella.
 */
test("producto sin inventario cargado: no hay aviso aunque se pidan muchas piezas", async ({ page }) => {
    await login(page);
    await page.goto("/nota/crear");
    await addProduct(page, "CASTEL"); // piso del seeder: en la base e2e nunca se cuenta ni se vende
    await page.locator('input[name="quantity"]').first().fill("50");
    await expect(page.getByText("Sin inventario cargado")).toBeVisible();
    await expect(page.getByText(/Disponibles:/)).toHaveCount(0);
    await expect(page.getByRole("status").filter({ hasText: "disponibles" })).toHaveCount(0);

    // En el buscador también se distingue de "0".
    await page.getByRole("button", { name: "Agregar producto" }).click();
    await page.getByPlaceholder("Buscar producto...").fill("CASTEL");
    await expect(page.getByRole("row", { name: /CASTEL/ })).toContainText("sin inventario");
});

test("vendido sin inventario cargado: se descuenta desde 0 y se ve el número, sin aviso", async ({ page }) => {
    await login(page);
    // Vende 2 MICHELIN (en la base e2e nunca se cuenta): queda en negativo.
    await page.goto("/nota/crear");
    await page.fill('input[name="note_number"]', "E2E-SIN-INV");
    await addProduct(page, "MICHELIN");
    await page.locator('input[name="quantity"]').first().fill("2");
    await page.getByRole("button", { name: "Crear nota" }).first().click();
    await page.waitForURL(/\/nota\/\d+$/);

    await page.goto("/productos?query=MICHELIN");
    await expect(page.getByRole("row", { name: /MICHELIN/ })).toContainText(/-\d+/);

    await page.goto("/nota/crear");
    await addProduct(page, "MICHELIN");
    await expect(page.getByText(/Disponibles: -\d+/)).toBeVisible();
    await expect(page.getByRole("status").filter({ hasText: "disponibles" })).toHaveCount(0);
});

test("la nota avisa cuando se piden más piezas de las disponibles", async ({ page }) => {
    await login(page);

    // Existencias de PIRELLI en la sucursal activa: 5.
    await page.goto("/productos?query=PIRELLI");
    await page.getByRole("row", { name: /PIRELLI/ }).getByText("PIRELLI").click();
    await page.waitForURL(/\/productos\/\d+$/);
    await page.fill('input[name="stock"]', "5");
    await page.getByRole("button", { name: /Guardar cambios/ }).click();
    await expect(page.getByText(/actualizado correctamente/).first()).toBeVisible();

    await page.goto("/nota/crear");
    await page.fill('input[name="date"]', "2026-06-20");
    await page.fill('input[name="note_number"]', "E2E-STOCK");
    await addProduct(page, "PIRELLI");
    const qty = page.locator('input[name="quantity"]').first();
    const warning = page.getByRole("status").filter({ hasText: "disponibles" });

    await expect(page.getByText("Disponibles: 5")).toBeVisible();
    await qty.fill("3");
    await expect(warning).toHaveCount(0);

    await qty.fill("7");
    await expect(warning).toContainText("Solo hay 5 disponibles");
    await expect(warning).toContainText("pide 7");

    // No bloquea: se guarda con 5 (deja el stock en 0).
    await qty.fill("5");
    await page.getByRole("button", { name: "Crear nota" }).first().click();
    await page.waitForURL(/\/nota\/\d+$/);

    // Al reabrirla, sus 5 piezas cuentan como disponibles: no hay aviso.
    await page.reload();
    await expect(page.getByText("Disponibles: 5")).toBeVisible();
    await expect(warning).toHaveCount(0);
    await page.locator('input[name="quantity"]').first().fill("6");
    await expect(warning).toContainText("Solo hay 5 disponibles");

    // Y el stock quedó en 0 (no se descontó dos veces al reabrir/guardar).
    await page.locator('input[name="quantity"]').first().fill("5");
    await page.getByRole("button", { name: "Guardar cambios" }).first().click();
    await page.waitForLoadState("networkidle");
    await page.goto("/productos?query=PIRELLI");
    await expect(page.getByRole("row", { name: /PIRELLI/ })).toContainText(/\b0\s*$/);
});
