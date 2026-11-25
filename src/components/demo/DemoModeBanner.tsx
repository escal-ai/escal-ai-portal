"use client";

import React from "react";
import { FlaskConical } from "lucide-react";
import { DEMO_BANNER_TEXT, IS_DEMO } from "../../lib/app-env";

/**
 * Fixed demo banner. Rendered only on the demo deployment so a prospect (and
 * our own staff) can never mistake a simulation for a real order.
 */
export const DemoModeBanner: React.FC<{ lang: "es" | "en" }> = ({ lang }) => {
  if (!IS_DEMO) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="w-full bg-[#b45309] text-white px-4 py-2 flex items-center justify-center gap-2 text-xs sm:text-sm font-semibold tracking-wide"
    >
      <FlaskConical className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{DEMO_BANNER_TEXT[lang]}</span>
    </div>
  );
};
