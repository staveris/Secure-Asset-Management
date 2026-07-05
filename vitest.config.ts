import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@shared": path.resolve(import.meta.dirname, "shared"),
    },
  },
  test: {
    environment: "node",
    include: ["server/**/*.test.ts", "shared/**/*.test.ts"],
    exclude: [
      "**/node_modules/**",
      // Legacy standalone tsx harnesses (run via `npx tsx <file>`), not Vitest suites:
      "server/cyber-risks-seed.test.ts",
      "server/dora-applicability.test.ts",
      "server/evidence-storage.test.ts",
    ],
  },
});
