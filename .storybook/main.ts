import type { StorybookConfig } from "@storybook/react-vite";
import { demoData } from "../src/demo/vite-plugin";

const isPwaPlugin = (p: unknown): boolean =>
  typeof p === "object" && p !== null && "name" in p && String(p.name).startsWith("vite-plugin-pwa");

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.tsx"],
  addons: ["@storybook/addon-docs", "@storybook/addon-a11y"],
  framework: { name: "@storybook/react-vite", options: {} },
  // Firebase には接続せず、デモ用の例データ（src/demo）で画面を描画する。Service Worker（PWA）は作らない
  viteFinal: (config) => ({
    ...config,
    // アプリの開発サーバー（node_modules/.vite）と依存の事前処理のキャッシュを共有しない
    cacheDir: "node_modules/.cache/storybook-vite",
    plugins: [demoData(), ...(config.plugins ?? []).flat(10).filter((p) => !isPwaPlugin(p))],
  }),
};

export default config;
