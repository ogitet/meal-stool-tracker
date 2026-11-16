import { defineConfig, lazyPlugins, type Plugin } from "vite-plus";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { demoData } from "./src/demo/vite-plugin";

// アイコンの中身から作る版番号。iOS はホーム画面のアイコンを強くキャッシュするため、
// URL を変えて取り直させる。アイコンを作り直せば、自動で値が変わる。
// 画像のバイト列をそのままハッシュに渡す（文字列にすると、UTF-8 として読めないバイトが同じ文字に置き換わる）。
const iconHash = createHash("sha1");
for (const n of ["icon-192", "icon-512", "apple-touch-icon"]) iconHash.update(readFileSync(`public/icons/${n}.png`));
const ICON_VERSION = iconHash.digest("hex").slice(0, 8);

function iconCacheBuster(): Plugin {
  return {
    name: "icon-cache-buster",
    transformIndexHtml: (html) =>
      html.replace('href="/icons/apple-touch-icon.png"', `href="/icons/apple-touch-icon.png?v=${ICON_VERSION}"`),
  };
}

export default defineConfig(({ mode }) => ({
  // src 内の import は @/ から書く（型チェック用に、tsconfig.app.json の paths にも同じ対応を書いている）
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  // 整形（oxfmt）。今の書き方に合わせ、差分が最も小さい幅 120 にする。設計書（docs/）は文書なので対象外
  fmt: {
    printWidth: 120,
    singleQuote: false,
    semi: true,
    trailingComma: "all",
    ignorePatterns: ["dist/**", "storybook-static/**", "public/**", "docs/**", "package-lock.json"],
  },
  // lint（oxlint）。型情報を使うルールと型チェックも行う
  lint: {
    ignorePatterns: ["dist/**", "storybook-static/**", "public/**"],
    jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
    rules: { "vite-plus/prefer-vite-plus-imports": "error" },
    options: { typeAware: true, typeCheck: true },
    // src 内でフォルダーをまたぐ import は @/ で書く（同じフォルダー内の ./ は使える）
    overrides: [
      {
        files: ["src/**"],
        rules: {
          "no-restricted-imports": [
            "error",
            { patterns: [{ regex: "^\\.\\./", message: "src 内は @/ から始まるパスで import する" }] },
          ],
        },
      },
    ],
  },
  // コミット時に、ステージしたファイルだけを整形・修正する（.vite-hooks/pre-commit）
  // パターンごとに並行で走るため、同じファイルが2つのパターンに当たらないように分ける（配列の中は順に実行される）
  staged: {
    "*.css": ["vp check --fix", "stylelint"],
    "{*.tsx,index.html}": ["vp check --fix", "markuplint"],
    "!(*.css|*.tsx|index.html)": "vp check --fix",
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
        // 共有用の画像（OGP）は画面で使わないため、端末に保持しない
        globIgnores: ["og-image.png"],
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
