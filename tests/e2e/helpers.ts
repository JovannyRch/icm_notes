import { expect, Page } from "@playwright/test";

export const E2E_USER = { email: "e2e@icm.test", password: "password" };

export async function login(page: Page) {
    await page.goto("/login");
    await page.fill('input[name="email"]', E2E_USER.email);
    await page.fill('input[name="password"]', E2E_USER.password);
    await page.getByRole("button", { name: "Iniciar sesión" }).click();
    await page.waitForURL("**/notas");
}

/** Agrega una partida buscando el producto en el modal del catálogo. */
export async function addProduct(page: Page, brand: string) {
    await page.getByRole("button", { name: "Agregar producto" }).click();
    await page.getByPlaceholder("Buscar producto...").fill(brand);
    await page.getByRole("cell", { name: brand, exact: true }).first().click();
}

/** Llena una fila de pago. `index` 0 es el primer pago (sin fecha propia). */
export async function fillPayment(
    page: Page,
    index: number,
    amounts: { cash?: string; transfer?: string; card?: string; date?: string }
) {
    for (const method of ["cash", "transfer", "card"] as const) {
        const value = amounts[method];
        if (value !== undefined) {
            await page.fill(`input[name="payments.${index}.${method}"]`, value);
        }
    }

    if (amounts.date !== undefined) {
        const input = page.locator(`input[name="payments.${index}.date"]`);
        await input.fill(amounts.date);
        await input.press("Enter");
    }
}

/** Lee el importe mostrado junto a una etiqueta ("A/C:", "Restante:"). */
export async function amountNextTo(page: Page, label: string) {
    const row = page.locator("div", { hasText: new RegExp(`^${label}\\$`) });
    return (await row.last().innerText()).replace(label, "").trim();
}

export async function expectToast(page: Page, text: string | RegExp) {
    await expect(page.locator(".Toastify").getByText(text)).toBeVisible({
        timeout: 10_000,
    });
}

/** dd/MM/yyyy, el formato que usa el DatePicker de la nota. */
export function toDisplayDate(iso: string) {
    const [year, month, day] = iso.split("-");
    return `${day}/${month}/${year}`;
}

export function addDays(iso: string, days: number) {
    const date = new Date(`${iso}T00:00:00`);
    date.setDate(date.getDate() + days);
    return date.toISOString().slice(0, 10);
}
