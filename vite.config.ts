/// <reference types="vitest/config" />
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

const APP_NAME = "Arbets-EKG";
const APP_SHORT_NAME = "Arbets-EKG";

const { version } = JSON.parse(readFileSync("package.json", "utf8")) as { version: string };

// Date of the last commit that touched clinical content, shown on the About page.
function contentDate(): string {
  try {
    const date = execSync("git log -1 --format=%cs -- content public/strips", { encoding: "utf8" }).trim();
    if (date) return date;
  } catch {
    // not a git checkout
  }
  return new Date().toISOString().slice(0, 10);
}

// GitHub Pages serves the app from /<repo>/; set BASE_PATH in CI when the repo exists.
const base = process.env.BASE_PATH ?? "/";

export default defineConfig({
  base,
  define: {
    __APP_VERSION__: JSON.stringify(version),
    __CONTENT_DATE__: JSON.stringify(contentDate()),
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      includeAssets: ["favicon.svg", "apple-touch-icon.png"],
      manifest: {
        name: APP_NAME,
        short_name: APP_SHORT_NAME,
        description: "Utbildningsverktyg för EKG-, blodtrycks- och symtomfynd vid arbetsprov på cykel.",
        lang: "sv",
        start_url: base,
        scope: base,
        display: "standalone",
        orientation: "any",
        background_color: "#f8fafc",
        theme_color: "#0f172a",
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        // Precache every built file: code, content (bundled JSON) and ECG strips.
        globPatterns: ["**/*.{js,css,html,json,svg,png,ico,webmanifest}"],
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
        navigateFallback: "index.html",
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  test: {
    include: ["src/**/*.test.ts", "scripts/**/*.test.ts"],
  },
});
