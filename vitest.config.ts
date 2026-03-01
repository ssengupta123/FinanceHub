import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      reportsDirectory: "coverage",
      include: ["server/**/*.ts", "shared/**/*.ts"],
      exclude: [
        "server/vite.ts",
        "server/index.ts",
        "server/static.ts",
        "server/github.ts",
        "server/db.ts",
        "server/integrations/**",
        "server/replit_integrations/**",
        "shared/models/**",
        "**/*.test.ts",
      ],
    },
  },
  resolve: {
    alias: {
      "@shared": path.resolve(__dirname, "shared"),
    },
  },
});
