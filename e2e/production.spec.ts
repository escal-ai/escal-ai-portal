import { expect, test } from "@playwright/test";

/**
 * Production portal, read-only.
 *
 * The regression these tests exist for: the production login once advertised the
 * demo phone line and the demo shortcut buttons, leaking the sales sandbox into
 * the paying-client surface. Nothing here logs in — production stays untouched.
 */
test.describe("portal de producción (solo lectura)", () => {
  test("no anuncia la línea de prueba ni los atajos de demo", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("body")).toBeVisible();

    await expect(page.getByText(/776-0006/)).toHaveCount(0);
    await expect(page.getByText(/Atajos de demostración|Quick demo shortcuts/i)).toHaveCount(0);
    await expect(page.getByText(/La Estrella \(PIN: 1234\)/)).toHaveCount(0);
    await expect(page.getByText(/El Pulgarcito \(PIN: 5678\)/)).toHaveCount(0);
  });

  test("pide código de tienda en la pestaña de cocina", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByText(/Cocina KDS|Kitchen KDS/i).first()).toBeVisible();
    // Production shows a store-code gate; the demo shows a restaurant list instead.
    await expect(page.getByText(/STORE CODE|Código de tienda/i).first()).toBeVisible();
    await expect(page.getByPlaceholder(/esquivel/i)).toBeVisible();
  });

  test("no expone credenciales de owner en el HTML servido", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.status()).toBe(200);
    const html = await page.content();

    expect(html).not.toMatch(/owner@estrella\.com/i);
    expect(html).not.toMatch(/owner@esquivel\.com/i);
    expect(html).not.toMatch(/info@escal-ai\.com/i);
  });
});

test.describe("portal de producción: sin sesión no pide datos", () => {
  test("no consulta pedidos ni abre el stream del KDS de un restaurante demo", async ({
    page,
  }) => {
    const dataRequests: string[] = [];
    page.on("request", (request) => {
      const url = request.url();
      if (url.includes("/api/restaurants/") || url.includes("/kds/stream")) {
        dataRequests.push(url);
      }
    });

    await page.goto("/");
    await expect(page.getByText(/Cocina KDS|Kitchen KDS/i).first()).toBeVisible();
    await page.waitForTimeout(3000);

    // The public login page used to request orders and open an SSE stream with
    // `token=undefined` for a hard-coded demo tenant on every visit.
    expect(dataRequests).toEqual([]);
  });
});
