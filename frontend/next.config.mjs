import path from "node:path";
import { fileURLToPath } from "node:url";

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: path.dirname(fileURLToPath(import.meta.url)),
  },
  experimental: {
    // HeroUI is a barrel export — without this every page pulls the whole
    // component set. lucide-react is on Next's default optimize list already.
    optimizePackageImports: ["@heroui/react"],
  },
};

export default nextConfig;
