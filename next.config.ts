import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
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
    const engineBase = (
      process.env.NEXT_PUBLIC_ENGINE_API_URL ||
      "https://escal-ai-voice-engine-production.up.railway.app"
    ).replace(/\/$/, "");
    return [
      {
        source: "/p/:token",
        destination: `${engineBase}/p/:token`,
      },
    ];
  },
};

export default nextConfig;
