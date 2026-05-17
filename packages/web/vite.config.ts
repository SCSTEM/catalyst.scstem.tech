import path from "node:path";
import { sentryVitePlugin } from "@sentry/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const sentryEnvironment =
  process.env.CF_PAGES_BRANCH === "main" ? "production" : "staging";

export default defineConfig({
  plugins: [
    tanstackRouter({
      target: "react",
      autoCodeSplitting: true,
      quoteStyle: "double",
      semicolons: true,
    }),
    react(),
    tailwindcss(),
    sentryVitePlugin({
      org: process.env.SENTRY_ORG,
      // Hardcoded: deploy:site uploads to both Sentry projects in one run, so a
      // shared SENTRY_PROJECT env var can't disambiguate web from worker.
      project: "catalyst-web",
      authToken: process.env.SENTRY_AUTH_TOKEN,
      telemetry: false,
      disable: !(process.env.SENTRY_AUTH_TOKEN && process.env.SENTRY_ORG),
      release: {
        name: process.env.CF_PAGES_COMMIT_SHA,
        deploy: { env: sentryEnvironment },
      },
      sourcemaps: { filesToDeleteAfterUpload: ["./dist/**/*.map"] },
    }),
  ],
  build: {
    sourcemap: true,
  },
  // Cloudflare Pages injects CF_PAGES_* as real env vars at build time
  envPrefix: ["VITE_", "CF_PAGES_"],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      "/api": "http://localhost:8787",
    },
  },
});
