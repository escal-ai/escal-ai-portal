import type { NextConfig } from "next";

/**
 * Baseline security headers.
 *
 * HSTS stays short and WITHOUT `includeSubDomains`: `status.escal-ai.com` has no
 * valid certificate today, and committing to includeSubDomains would make every
 * browser refuse to load it for a year.
 *
 * The CSP is report-only on purpose. Next.js injects inline scripts, so an
 * enforcing policy needs per-request nonces (which turns prerendered pages
 * dynamic). Report-only collects the real allow-list from live traffic first.
 */
// The browser must be allowed to reach exactly one engine: this deployment's. The
// hardcoded pair (prod + demo) quietly permitted the production portal to call the
// demo API and vice versa, which is the opposite of the environment split the whole
// platform is built on. The client bundle already uses this same variable.
const ENGINE_BASE = (
  process.env.NEXT_PUBLIC_ENGINE_API_URL ||
  "https://escal-ai-voice-engine-production.up.railway.app"
).replace(/\/$/, "");
const ENGINE_WS = ENGINE_BASE.replace(/^http/, "ws");

const SECURITY_HEADERS = [
  { key: "Strict-Transport-Security", value: "max-age=300" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  {
    key: "Content-Security-Policy-Report-Only",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      `connect-src 'self' ${ENGINE_BASE} ${ENGINE_WS}`,
      "frame-ancestors 'self'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async rewrites() {
    const engineBase = ENGINE_BASE;
    return [
      {
        source: "/p/:token",
        destination: `${engineBase}/p/:token`,
      },
    ];
  },
};

export default nextConfig;
