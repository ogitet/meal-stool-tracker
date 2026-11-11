import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

/**
 * デモモード（`vite --mode demo`）：src/data/* の読み込みを src/demo/* のメモリ内実装に差し替える。
 * Firebase に接続せず全画面を描画でき、デザインの確認に使う。本番ビルドには影響しない。
 */
function demoData(): Plugin {
  return {
    name: "demo-data",
    enforce: "pre",
    async resolveId(source, importer, options) {
      if (!importer || importer.includes("/src/demo/")) return null;
      const resolved = await this.resolve(source, importer, { ...options, skipSelf: true });
      if (!resolved) return null;
      if (/\/src\/data\/(useAuth|categories|meals|stools)\.ts$/.test(resolved.id)) {
        return resolved.id.replace("/src/data/", "/src/demo/");
      }
      return resolved;
    },
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [
    ...(mode === "demo" ? [demoData()] : []),
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/apple-touch-icon.png"],
      manifest: {
        name: "ひびログ",
        short_name: "ひびログ",
        description: "食事と便の記録",
        lang: "ja",
        start_url: "/",
        display: "standalone",
        orientation: "portrait",
        background_color: "#CFDDF6",
        theme_color: "#CFDDF6",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        // 画面のファイルのみキャッシュする。Firestore への通信はキャッシュしない。
        globPatterns: ["**/*.{js,css,html,png,svg,woff2}"],
        navigateFallback: "/index.html",
        // Web フォント（Google Fonts）は初回の取得後、端末に保持する。
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "StaleWhileRevalidate",
            options: { cacheName: "google-fonts-css" },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-files",
              expiration: { maxEntries: 400, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
}));
