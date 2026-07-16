import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Mirror the Next.js "@/*" -> "./*" path alias so tests import lib/fixtures the
// same way the app does.
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["lib/__tests__/**/*.test.ts"],
  },
});
