import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config";

// Read migration SQL at config time so test seeds stay in sync with schema
const migrationsDir = resolve(__dirname, "migrations");
const migrationSql = readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort()
  .map((f) => readFileSync(resolve(migrationsDir, f), "utf-8"))
  .join("\n");

export default defineWorkersConfig({
  test: {
    poolOptions: {
      workers: {
        wrangler: {
          configPath: "./wrangler.jsonc",
        },
        miniflare: {
          bindings: {
            MIGRATION_SQL: migrationSql,
            SLACK_BOT_TOKEN: "xoxb-test-token",
            SLACK_SIGNING_SECRET: "test-signing-secret",
            SITE_PASSWORD: "000000",
          },
        },
      },
    },
  },
});
