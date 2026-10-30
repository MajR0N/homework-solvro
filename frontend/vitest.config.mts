import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Testy tylko dla czystej logiki (bez przeglądarki i bez Reacta); alias "@" jak w tsconfig.json
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: { include: ["src/**/*.test.ts"] },
});
