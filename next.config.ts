import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Let the dev server serve pages through a Cloudflare quick tunnel (for testing the Slip2Go webhook).
  allowedDevOrigins: ["*.trycloudflare.com"],
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
};

export default nextConfig;
