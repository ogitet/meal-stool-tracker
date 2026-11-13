import { defineConfig, lazyPlugins, type Plugin } from "vite-plus";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

// アイコンの中身から作る版番号。iOS はホーム画面のアイコンを強くキャッシュするため、
// URL を変えて取り直させる。アイコンを作り直せば、自動で値が変わる。
const ICON_VERSION = createHash("sha1")
  .update(["icon-192", "icon-512", "apple-touch-icon"].map((n) => readFileSync(`public/icons/${n}.png`)).join(""))
  .digest("hex")
  .slice(0, 8);

function iconCacheBuster(): Plugin {
  return {
    name: "icon-cache-buster",
    transformIndexHtml: (html) =>
      html.replace('href="/icons/apple-touch-icon.png"', `href="/icons/apple-touch-icon.png?v=${ICON_VERSION}"`),
  };
}

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
  // 整形（oxfmt）。今の書き方に合わせ、差分が最も小さい幅 120 にする。設計書（docs/）は文書なので対象外
  fmt: {
    printWidth: 120,
    singleQuote: false,
    semi: true,
    trailingComma: "all",
    ignorePatterns: ["dist/**", "public/**", "docs/**", "package-lock.json"],
  },
  // lint（oxlint）。型情報を使うルールと型チェックも行う
  lint: {
    ignorePatterns: ["dist/**", "public/**"],
    jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
    rules: { "vite-plus/prefer-vite-plus-imports": "error" },
    options: { typeAware: true, typeCheck: true },
  },
  // コミット時に、ステージしたファイルだけを整形・修正する（.vite-hooks/pre-commit）
  staged: {
    "*": "vp check --fix",
  },
  // vp check・lint・fmt のときはプラグインを読み込まない（設定の評価を軽くする）
  plugins: lazyPlugins(() => [
    ...(mode === "demo" ? [demoData()] : []),
    react(),
    iconCacheBuster(),
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
          { src: `/icons/icon-192.png?v=${ICON_VERSION}`, sizes: "192x192", type: "image/png" },
          { src: `/icons/icon-512.png?v=${ICON_VERSION}`, sizes: "512x512", type: "image/png" },
          { src: `/icons/icon-512.png?v=${ICON_VERSION}`, sizes: "512x512", type: "image/png", purpose: "maskable" },
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
  ]),
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "scripts/**/*.test.ts"],
  },
}));
