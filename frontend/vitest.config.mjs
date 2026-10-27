import { fileURLToPath } from "node:url";
import { transformWithOxc } from "vite";
import { defineConfig } from "vitest/config";

// Next.js compiles JSX that lives in .js files (e.g. src/components/ui/*.js).
// Vite's oxc plugin skips .js by default, so parse those files as JSX here.
const jsxInJs = {
  name: "nvi:jsx-in-js",
  enforce: "pre",
  async transform(code, id) {
    const [filepath] = id.split("?");
    if (!filepath.endsWith(".js") || filepath.includes("node_modules")) return null;
    if (!code.includes("<")) return null;
    const result = await transformWithOxc(code, id, {
      lang: "jsx",
      jsx: { runtime: "automatic", importSource: "react" },
      sourcemap: true
    });
    return { code: result.code, map: result.map };
  }
};

export default defineConfig({
  plugins: [jsxInJs],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url))
    }
  },
  test: {
    environment: "node",
    globals: true,
    include: ["tests/**/*.{test.js,test.jsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "html", "lcov"],
      reportsDirectory: "coverage",
      include: ["src/**/*.{js,jsx}"],
      exclude: ["**/node_modules/**", "tests/**"],
      reportOnFailure: true
    }
  }
});
