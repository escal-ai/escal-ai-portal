import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/**
 * Accessibility gate on the login screen of both portals.
 *
 * Both portals are clean at `critical` and `serious` level as of 25-nov, so the
 * gate blocks on both: the point is to keep them clean, not to grade them once.
 * Moderate and minor findings are printed but do not fail the run — they belong
 * to the visual-palette debt and are tracked separately.
 */
const PORTALS = [
  { name: "producción", url: "https://app.escal-ai.com" },
  { name: "demo", url: "https://demo.escal-ai.com" },
];

for (const portal of PORTALS) {
  test(`sin violaciones críticas ni serias de accesibilidad: ${portal.name}`, async ({ page }) => {
    await page.goto(portal.url);
    await page.waitForLoadState("networkidle");

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();

    const blocking = results.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious"
    );
    const rest = results.violations.filter(
      (v) => v.impact !== "critical" && v.impact !== "serious"
    );

    if (rest.length > 0) {
      console.log(
        `[a11y] ${portal.name}: ${rest.length} hallazgo(s) menores de la deuda visual:\n` +
          rest.map((v) => `  - ${v.impact} ${v.id} (${v.nodes.length} nodos): ${v.help}`).join("\n")
      );
    }

    expect(
      blocking.map((v) => `${v.impact}: ${v.id}: ${v.help}`),
      `violaciones críticas o serias en ${portal.name}`
    ).toEqual([]);
  });
}
