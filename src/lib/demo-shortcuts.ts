import { IS_DEMO } from "./app-env";

/**
 * One-click demo shortcuts for sales calls.
 *
 * The PINs used to be literals in this module's neighbours, which meant the
 * production bundle shipped them too — and they are the same PINs the seeded
 * restaurants use. They now come from `NEXT_PUBLIC_DEMO_SHORTCUTS`, set only on the
 * demo deployment, so a production build contains no credentials at all.
 */
export interface DemoShortcut {
  label: string;
  restaurant_id: string;
  pin: string;
}

function parseShortcuts(raw: string | undefined): DemoShortcut[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((entry) => {
      if (typeof entry !== "object" || entry === null) return [];
      const record = entry as Record<string, unknown>;
      const label = typeof record.label === "string" ? record.label : "";
      const restaurantId =
        typeof record.restaurant_id === "string" ? record.restaurant_id : "";
      const pin = typeof record.pin === "string" ? record.pin : "";
      if (!label || !restaurantId || !/^\d{4}$/.test(pin)) return [];
      return [{ label, restaurant_id: restaurantId, pin }];
    });
  } catch {
    return [];
  }
}

/** Empty outside demo: the sales shortcuts must not exist in production at all. */
export const DEMO_SHORTCUTS: DemoShortcut[] = IS_DEMO
  ? parseShortcuts(process.env.NEXT_PUBLIC_DEMO_SHORTCUTS)
  : [];
