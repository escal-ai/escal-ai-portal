/**
 * Portal environment contract.
 *
 * `demo.escal-ai.com` is the sales sandbox (prospect menus, magic links) while
 * `app.escal-ai.com` serves paying clients. Anything demo-only must be gated
 * behind `IS_DEMO` so a production bundle cannot expose demo shortcuts, magic
 * PIN logins, or the prospect portfolio.
 */
export type PortalAppEnv = "production" | "demo";

export const APP_ENV: PortalAppEnv =
  process.env.NEXT_PUBLIC_APP_ENV === "demo" ? "demo" : "production";

export const IS_DEMO: boolean = APP_ENV === "demo";

/** Persistent high-contrast banner copy (WCAG AA: white on #b45309). */
export const DEMO_BANNER_TEXT = {
  es: "MODO DEMOSTRACIÓN — simulación interactiva con menú personalizado. Los pedidos no son reales.",
  en: "DEMO MODE — interactive simulation with a custom menu. Orders are not real.",
} as const;
