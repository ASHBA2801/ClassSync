import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  output: "standalone",
  // Keep Turbopack rooted at this app so it resolves `next` correctly on Windows
  // paths (including directories with spaces).
  turbopack: {
    root: projectRoot,
  },
  redirects: async () => [
    {
      source: "/parent/fees/payment-success",
      destination: "/parent/fees",
      permanent: false,
    },
  ],
  headers: async () => [
    {
      source: "/sw.js",
      headers: [
        { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        { key: "Service-Worker-Allowed", value: "/" },
      ],
    },
  ],
};

export default nextConfig;
