import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/**
 * Accessibility gate on the login screen of both portals.
 *
 * Scope is deliberately narrow for the first pass: only `critical` violations
 * block, because the portal still carries a large visual-palette debt and a
 * stricter threshold would fail on day one and get ignored. The full report is
 * printed so the remaining debt stays visible instead of hidden.
 */
const PORTALS = [
  { name: "producción", url: "https://app.escal-ai.com" },
  { name: "demo", url: "https://demo.escal-ai.com" },
];

for (const portal of PORTALS) {
  test(`sin violaciones críticas de accesibilidad: ${portal.name}`, async ({ page }) => {
    await page.goto(portal.url);
    await page.waitForLoadState("networkidle");

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();

    const critical = results.violations.filter((v) => v.impact === "critical");
    const serious = results.violations.filter((v) => v.impact === "serious");

    if (serious.length > 0) {
      console.log(
        `[a11y] ${portal.name}: ${serious.length} violación(es) seria(s) pendientes de la deuda visual:\n` +
          serious
            .map((v) => `  - ${v.id} (${v.nodes.length} nodos): ${v.help}`)
            .join("\n")
      );
    }

    expect(
      critical.map((v) => `${v.id}: ${v.help}`),
      `violaciones críticas en ${portal.name}`
    ).toEqual([]);
  });
}
