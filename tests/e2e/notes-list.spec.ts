import { expect, Page, test } from "@playwright/test";
import { addProduct, expectToast, login } from "./helpers";

/**
 * Listado de notas: búsqueda, filtro de fecha, abrir nota, selección, archivar,
 * desarchivar y eliminar. Red de seguridad para el rediseño del listado.
 */
const NOTE_DATE = "2026-06-10"; // fuera de "esta semana" a propósito

async function createNote(page: Page, folio: string) {
    await page.goto("/nota/crear");
    await page.fill('input[name="date"]', NOTE_DATE);
    await page.fill('input[name="note_number"]', folio);
    await page.fill('input[name="customer"]', "Listado");
    await addProduct(page, "GOODYEAR");
    await page.getByRole("button", { name: "Crear nota" }).first().click();
    await page.waitForURL(/\/nota\/\d+$/);
}

const row = (page: Page, folio: string) => page.getByRole("row", { name: new RegExp(folio) });

async function select(page: Page, folio: string) {
    await row(page, folio).getByRole("checkbox").click();
}

/** Acepta la confirmación, sea window.confirm o el diálogo de react-confirm-alert. */
async function confirmDelete(page: Page) {
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Eliminar", exact: true }).click();
    const alertButton = page.locator(".react-confirm-alert-button-group button").first();
    if (await alertButton.isVisible({ timeout: 1500 }).catch(() => false)) {
        await alertButton.click();
    }
}

test("listado: buscar, filtrar, abrir, archivar, desarchivar y eliminar", async ({ page }) => {
    await login(page);
    await createNote(page, "E2E-LIST-1");
    await createNote(page, "E2E-LIST-2");

    // El filtro de fecha se respeta: en "esta semana" no aparecen.
    await page.goto("/notas?date=THIS_WEEK&query=E2E-LIST");
    await expect(page.getByText("No se encontraron notas")).toBeVisible();

    // Cambiar el filtro de fecha desde la interfaz.
    await page.getByRole("button", { name: /Fecha/ }).click();
    await page.getByRole("menuitem", { name: "Todo el tiempo" }).click();
    await expect(page).toHaveURL(/date=ALL_TIME/);
    await expect(row(page, "E2E-LIST-1")).toBeVisible();
    await expect(row(page, "E2E-LIST-2")).toBeVisible();

    // Rango propio de fechas: incluye el día de las notas.
    await page.getByRole("button", { name: /Fecha/ }).click();
    await page.getByRole("menuitem", { name: /Elegir fechas/ }).click();
    await page.getByLabel("Desde").fill("2026-06-01");
    await page.getByLabel("Hasta").fill("2026-06-30");
    await page.getByRole("button", { name: "Ver notas" }).click();
    await expect(page).toHaveURL(/date=CUSTOM/);
    await expect(page.getByRole("button", { name: /Fecha/ })).toContainText("1 jun – 30 jun");
    await expect(row(page, "E2E-LIST-1")).toBeVisible();

    // "Hoy": las notas de junio no aparecen.
    await page.getByRole("button", { name: /Fecha/ }).click();
    await page.getByRole("menuitem", { name: "Hoy" }).click();
    await expect(page).toHaveURL(/date=TODAY/);
    await expect(page).not.toHaveURL(/desde=/);
    await expect(row(page, "E2E-LIST-1")).toHaveCount(0);

    // Búsqueda por folio desde el buscador.
    await page.goto("/notas?date=ALL_TIME&query=E2E-LIST");
    await page.getByPlaceholder("Folio, cliente, teléfono o código...").fill("E2E-LIST-2");
    await page.getByRole("button", { name: "Buscar" }).click();
    await expect(page).toHaveURL(/query=E2E-LIST-2/);
    await expect(row(page, "E2E-LIST-1")).toHaveCount(0);
    await expect(row(page, "E2E-LIST-2")).toBeVisible();

    // La flecha despliega el resumen en la misma lista, sin abrir la nota.
    await row(page, "E2E-LIST-2").getByRole("button", { name: "Resumen de la nota E2E-LIST-2" }).click();
    const summary = page.getByTestId("detalle-E2E-LIST-2").filter({ visible: true });
    await expect(summary).toContainText("GOODYEAR");
    await expect(summary).toContainText("Total");
    await expect(page).toHaveURL(/\/notas/);

    // Clic en la fila abre la nota.
    await row(page, "E2E-LIST-2").getByText("E2E-LIST-2").click();
    await page.waitForURL(/\/nota\/\d+$/);

    // Archivar una.
    await page.goto("/notas?date=ALL_TIME&query=E2E-LIST");
    await select(page, "E2E-LIST-1");
    await page.getByRole("button", { name: "Archivar", exact: true }).click();
    await expectToast(page, "Nota archivada");
    await expect(row(page, "E2E-LIST-1")).toHaveCount(0);

    // En la pestaña de archivadas aparece y se puede desarchivar.
    await page.getByRole("tab", { name: "Archivadas" }).click();
    await expect(page).toHaveURL(/archived=1/);
    await expect(row(page, "E2E-LIST-1")).toBeVisible();
    await expect(row(page, "E2E-LIST-2")).toHaveCount(0);
    await select(page, "E2E-LIST-1");
    await page.getByRole("button", { name: "Desarchivar", exact: true }).click();
    await expectToast(page, "Nota desarchivada");

    await expect(row(page, "E2E-LIST-1")).toHaveCount(0);

    // De vuelta en activas, eliminar las dos.
    await page.getByRole("tab", { name: "Activas" }).click();
    await expect(page).not.toHaveURL(/archived=/);
    // Las pestañas conservan la fecha pero no la búsqueda (igual que antes): se vuelve a buscar.
    await page.goto("/notas?date=ALL_TIME&query=E2E-LIST");
    await expect(row(page, "E2E-LIST-1")).toBeVisible();
    await select(page, "E2E-LIST-1");
    await select(page, "E2E-LIST-2");
    await confirmDelete(page);
    await expectToast(page, /2 notas eliminad/);
    await expect(page.getByText("No se encontraron notas")).toBeVisible();
});
