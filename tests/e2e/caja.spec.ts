import { expect, test } from "@playwright/test";

import { login } from "./helpers";

async function loginCashier(page: import("@playwright/test").Page) {
    await page.goto("/login");
    await page.fill('input[name="email"]', "caja-e2e@icm.test");
    await page.fill('input[name="password"]', "password");
    await page.getByRole("button", { name: "Iniciar sesión" }).click();
    await page.waitForURL("**/caja");
}

/** Caja de punta a punta como cajero: buscar con teclado, cobrar con cambio, ticket, QR y cancelar. */
test("el cajero cobra una venta de contado con cambio", async ({ page }) => {
    await loginCashier(page);

    const search = page.getByRole("combobox", { name: "Buscar producto" });
    await expect(search).toBeFocused();

    // Teclado: escribir y Enter agrega el primer resultado.
    await search.fill("MICHELIN");
    await expect(page.getByRole("option").first()).toContainText("MICHELIN");
    // El MC del producto se muestra como m² por caja (modelos iguales con distinto m²).
    await expect(page.getByRole("option").first()).toContainText("1 m²/caja");
    await search.press("Enter");
    await search.fill("PIRELLI");
    await page.getByRole("option", { name: /PIRELLI/ }).click();
    await page.getByRole("button", { name: "Agregar uno" }).nth(1).click();

    const total = page.getByTestId("caja-total");
    await expect(total).toHaveText("$6,100.00"); // 2500 + 2×1800

    // El cajero puede cambiar el precio (permiso encendido por omisión).
    await expect(page.getByLabel("Precio de PIRELLI P7")).toBeVisible();

    // Descuentos apagados por ahora: no hay campos de descuento.
    await expect(page.locator("#caja-discount")).toHaveCount(0);

    await page.keyboard.press("F8");
    await expect(page.locator("#caja-cash")).toBeFocused();
    await page.keyboard.type("6200");
    await expect(page.getByTestId("caja-change")).toHaveText("$100.00");

    // Al cobrar se imprime solo: el ticket se carga en un iframe oculto con ?print=1.
    const ticketRequest = page.waitForRequest((r) => /\/nota\/\d+\/ticket\?print=1/.test(r.url()));
    await page.keyboard.press("F12");
    const dialog = page.getByRole("dialog", { name: "Venta registrada" });
    await expect(dialog).toContainText("$100.00");
    const ticketUrl = (await ticketRequest).url();
    const ticket = await page.request.get(ticketUrl.replace("?print=1", ""));
    const ticketHtml = await ticket.text();
    expect(ticketHtml).toContain("$6,100.00");
    const saleCode = ticketHtml.match(/alt="QR ([2-9A-HJKMNP-Z]{10})"/)![1];
    // El ticket también se descarga en PDF desde el mismo diálogo.
    const [download] = await Promise.all([page.waitForEvent("download"), dialog.getByRole("button", { name: "PDF" }).click()]);
    expect(download.suggestedFilename()).toMatch(/^ticket-.+\.pdf$/);
    await dialog.getByRole("button", { name: "Nueva venta" }).click();
    await expect(total).toHaveText("$0.00");
    await expect(search).toBeFocused();

    // Escanear el QR del ticket en el buscador (el lector "teclea" el enlace + Enter)
    // abre esa venta en otra pestaña, sin perder la caja.
    await search.fill(`${new URL(ticketUrl).origin}/v/${saleCode}`);
    await expect(page.getByText(`Ticket ${saleCode}`)).toBeVisible();
    const [saleTab] = await Promise.all([page.context().waitForEvent("page"), search.press("Enter")]);
    await saleTab.waitForLoadState();
    expect(saleTab.url()).toMatch(/\/nota\/\d+\/ticket$/);
    await expect(saleTab.locator("body")).toContainText("$6,100.00");
    await saleTab.close();

    // Mis ventas: aparece, y se puede cancelar (es suya y del día).
    await page.getByRole("button", { name: "Mis ventas" }).click();
    await page.waitForURL("**/caja/ventas");
    const row = page.getByRole("row", { name: /6,100\.00/ }).first();
    await expect(row).toContainText("Público en general");
    await row.getByRole("button", { name: "Cancelar" }).click();
    // Pide el motivo: sin él no cancela.
    const cancelDialog = page.getByRole("dialog", { name: /Cancelar venta/ });
    await cancelDialog.getByRole("button", { name: "Cancelar venta" }).click();
    await expect(cancelDialog).toContainText("Escribe el motivo");
    await cancelDialog.getByRole("button", { name: "El cliente se arrepintió" }).click();
    await cancelDialog.getByRole("button", { name: "Cancelar venta" }).click();
    await expect(page.getByText(/cancelada/).first()).toBeVisible();
    await expect(page.getByRole("row", { name: /6,100\.00/ }).first()).toContainText("Motivo: El cliente se arrepintió");
});

/** Venta a crédito en caja y cobro del saldo desde el dashboard del dueño. */
test("venta a crédito con abono y cobro del resto desde el dashboard", async ({ page, browser }) => {
    await loginCashier(page);
    const search = page.getByRole("combobox", { name: "Buscar producto" });
    await search.fill("GOODYEAR");
    await expect(page.getByRole("option").first()).toContainText("GOODYEAR");
    await search.press("Enter"); // $1,500

    await page.getByRole("switch", { name: /A crédito/ }).click();
    // Sin nombre ni teléfono no deja registrar.
    // Los datos del cliente son opcionales; se capturan para la cobranza.
    await expect(page.getByRole("button", { name: "Registrar venta a crédito" })).toBeEnabled();
    await page.getByLabel(/^Cliente/).fill("Cliente Crédito E2E");
    // El teléfono es opcional; se captura para cobranza.
    await page.getByLabel(/^Teléfono/).fill("712 555 0101");
    await page.getByLabel("Dirección").fill("Calle Falsa 123");

    await page.fill("#caja-down", "500");
    await expect(page.getByTestId("caja-balance")).toHaveText("$1,000.00");
    await page.getByRole("button", { name: "Registrar venta a crédito" }).click();

    const dialog = page.getByRole("dialog", { name: "Venta registrada" });
    await expect(dialog).toContainText("queda a deber");
    await expect(dialog).toContainText("$1,000.00");
    await dialog.getByRole("button", { name: "Nueva venta" }).click();

    await page.getByRole("button", { name: "Mis ventas" }).click();
    await expect(page.getByRole("row", { name: /Cliente Crédito E2E/ })).toContainText("Resta: $1,000.00");
    await expect(page.getByRole("row", { name: /Cliente Crédito E2E/ })).toContainText("A cuenta: $500.00");
    await expect(page.getByTestId("ventas-credito")).toContainText("$1,000.00");
    // El resumen de la venta se despliega en la misma lista.
    await page.getByRole("button", { name: /Detalle de la venta/ }).first().click();
    const detail = page.locator('[data-testid^="detalle-"]').first();
    await expect(detail).toContainText("GOODYEAR");
    await expect(detail).toContainText("Resta");
    await expect(detail).toContainText("Tel. 712 555 0101");

    // El dueño la ve en "Notas por cobrar" y cobra el resto.
    const owner = await (await browser.newContext()).newPage();
    await login(owner);
    const pending = owner.getByRole("row", { name: /Cliente Crédito E2E/ });
    await expect(pending).toContainText("Tel. 712 555 0101");
    await expect(pending).toContainText("$1,000.00");
    await pending.getByRole("button", { name: "Cobrar" }).click();
    const collect = owner.getByRole("dialog");
    await expect(collect.getByLabel("Importe que pagó")).toHaveValue("1000");
    await collect.getByRole("radio", { name: "Transferencia" }).click();
    await collect.getByRole("button", { name: "Registrar pago" }).click();
    await expect(owner.getByText(/pagada\./)).toBeVisible();
    await expect(owner.getByRole("row", { name: /Cliente Crédito E2E/ })).toHaveCount(0);
});

/** Pisos: el cajero escribe los m² que necesita el cliente y la caja calcula las cajas. */
test("m² que pide el cliente se convierten en cajas, redondeando hacia arriba", async ({ page }) => {
    await loginCashier(page);
    const search = page.getByRole("combobox", { name: "Buscar producto" });
    await search.fill("MARMOL E2E");
    await expect(page.getByRole("option").first()).toContainText("1.44 m²/caja");
    await search.press("Enter");

    const m2 = page.getByLabel("m² que necesita de CASTEL MARMOL E2E");
    const quantity = page.getByLabel("Cantidad de CASTEL MARMOL E2E");
    const summary = page.getByTestId("line-m2");

    // 20 m² ÷ 1.44 = 13.9 → 14 cajas (cubren 20.16 m²).
    await m2.fill("20");
    await expect(quantity).toHaveValue("14");
    await expect(summary).toHaveText("Pidió 20 m² → 14 cajas cubren 20.16 m²");
    await expect(page.getByTestId("caja-total")).toHaveText("$5,446.00"); // 14 × 389

    // Exacto: 14.4 m² son 10 cajas justas.
    await m2.fill("14.4");
    await expect(quantity).toHaveValue("10");

    // Cambiar la cantidad a mano deja de lado los m² pedidos.
    await page.getByRole("button", { name: "Agregar uno" }).click();
    await expect(quantity).toHaveValue("11");
    await expect(m2).toHaveValue("");
    await expect(summary).toHaveText("15.84 m² en total");
});

/** Catálogo del cajero: buscar sin ver costos y mandar un producto a la caja. */
test("el cajero consulta el catálogo y manda un producto a la caja", async ({ page }) => {
    await loginCashier(page);
    await page.getByRole("link", { name: "Productos" }).first().click();
    await page.waitForURL("**/catalogo");

    // Sin datos sensibles.
    await expect(page.getByText("Costo")).toHaveCount(0);
    await expect(page.getByText("IVA")).toHaveCount(0);

    await page.getByRole("searchbox", { name: "Buscar productos" }).fill("MARMOL E2E");
    const row = page.getByRole("row", { name: /MARMOL E2E/ });
    await expect(row).toContainText("1.44 m²/caja");
    await expect(row).toContainText("$270.14 / m²"); // 389 ÷ 1.44
    await row.getByRole("button", { name: /Vender/ }).click();

    await page.waitForURL("**/caja");
    await expect(page.getByLabel("Cantidad de CASTEL MARMOL E2E")).toHaveValue("1");
    await expect(page.getByTestId("caja-total")).toHaveText("$389.00");
    // El flete se escribe en cada venta y se suma al total.
    await page.getByLabel("Flete").fill("150");
    await expect(page.getByTestId("caja-total")).toHaveText("$539.00");
    // El folio es automático: el cajero no lo puede cambiar.
    await expect(page.getByTitle("Folio automático: lo asigna el sistema al cobrar")).toBeVisible();
});

/** Producto sin precio: no deja cobrar en $0; el cajero escribe el precio y lo guarda en el catálogo. */
test("producto sin precio: el cajero lo escribe y lo guarda como precio nuevo", async ({ page }) => {
    await loginCashier(page);
    const search = page.getByRole("combobox", { name: "Buscar producto" });
    await search.fill("SIN PRECIO E2E");
    await expect(page.getByRole("option").first()).toContainText("SIN PRECIO E2E");
    await search.press("Enter");

    await expect(page.getByText("Sin precio", { exact: true })).toBeVisible();
    await expect(page.getByText("Hay productos sin precio: escribe su precio.")).toBeVisible();
    await expect(page.getByRole("button", { name: /^Cobrar/ })).toBeDisabled();

    await page.getByLabel("Precio de NUEVO SIN PRECIO E2E").fill("450");
    await page.getByLabel("Guardar como precio nuevo").check();
    await page.fill("#caja-cash", "450");
    await page.getByRole("button", { name: /^Cobrar/ }).click();

    const dialog = page.getByRole("dialog", { name: "Venta registrada" });
    await expect(dialog).toContainText("Se guardó el precio nuevo de 1 producto en el catálogo.");
    await dialog.getByRole("button", { name: "Nueva venta" }).click();

    // La siguiente búsqueda ya trae el precio nuevo.
    await search.fill("SIN PRECIO E2E");
    await expect(page.getByRole("option").first()).toContainText("$450.00");
});

/** El cajero hace el corte del día de su sucursal sin ver las compras. */
test("el cajero hace el corte del día sin ver compras", async ({ page }) => {
    await loginCashier(page);
    await page.getByRole("link", { name: "Corte" }).first().click();
    await page.waitForURL("**/cortes");
    await expect(page.getByRole("button", { name: /Corte semanal/ })).toHaveCount(0);

    await expect(page.getByText("Todavía no se hace el corte de hoy")).toBeVisible();
    await page.getByRole("button", { name: /Hacer el corte de hoy/ }).click();
    await page.waitForURL(/\/cortes\/crear/);
    await expect(page.getByText(/Total de compra/i)).toHaveCount(0);
    await expect(page.getByRole("columnheader", { name: "Total compra" })).toHaveCount(0);

    await page.getByRole("button", { name: /Guardar corte/ }).click();
    await page.waitForURL(/\/corte\/\d+$/);
    await expect(page.getByText(/Total de compra/i)).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Eliminar" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Descargar PDF/ })).toBeVisible();
});
