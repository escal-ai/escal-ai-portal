import { expect, test } from "@playwright/test";

/**
 * Demo portal: the sales sandbox where the full flow is exercised.
 *
 * Interactive work happens only here. Demo data is purged nightly and the demo
 * engine never charges a card nor rings a real phone.
 */
test.describe("portal demo", () => {
  test("muestra el aviso de entorno demo y la línea de prueba", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByText(/776-0006/)).toBeVisible();
    await expect(
      page.getByText(/Atajos de demostración|Quick demo shortcuts/i)
    ).toBeVisible();
    // Demo lists the sandbox restaurants instead of asking for a store code.
    await expect(page.getByText(/RESTAURANT|RESTAURANTE/i).first()).toBeVisible();
  });

  test("entra al KDS de cocina con el atajo de La Estrella", async ({ page }) => {
    await page.goto("/");

    // The shortcut fills the restaurant and the PIN and submits by itself.
    await page.getByText(/La Estrella \(PIN: 1234\)/).click();

    // The kitchen session is the only interactive login this suite performs.
    await expect(page.getByText(/KITCHEN DISPLAY SYSTEM/i)).toBeVisible();
    // Deliberately not asserting "no pending orders": a live demo may hold real
    // tickets from a sales call, and that would fail a test about logging in. What
    // matters is that the session works: the board renders and the token is stored.
    await expect(
      page.getByText(/No pending orders to cook|PENDING|EN COCINA|Ready for pickup/i).first()
    ).toBeVisible();

    const sessionKeys = await page.evaluate(() => Object.keys(window.localStorage));
    expect(sessionKeys).toContain("escal_ai_portal_session_v1");
  });
});
