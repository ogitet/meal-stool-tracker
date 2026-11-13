# レシピ：PWA にする

このリポジトリの PWA の構成を、別のプロジェクト（`app-template` から作ったものを想定）に足す手順。具体的なコードは、このリポジトリの `vite.config.ts` を手本にする。

1. `devDependencies` に `vite-plugin-pwa` を足し、`tsconfig.app.json` の `types` に `"vite-plugin-pwa/client"` を足す。
2. `vite.config.ts` の `plugins` に `VitePWA({ registerType: "autoUpdate", manifest: {...}, workbox: {...} })` を足す。
   - キャッシュするのは画面のファイルだけにする（`globPatterns`）。API やデータベースへの通信はキャッシュしない。
   - `navigateFallback` は `/index.html`。
3. `src/main.tsx` で `registerSW({ immediate: true })` を呼ぶ（`virtual:pwa-register`）。
4. `index.html` に `apple-mobile-web-app-capable`、`apple-mobile-web-app-title`、`theme-color`、`apple-touch-icon` を足す。
5. アイコン（192、512、apple-touch-icon）を `public/icons/` に置く。
6. `.storybook/main.ts` の `viteFinal` で、名前が `vite-plugin-pwa` で始まるプラグインを除く（Storybook では Service Worker を作らない）。
7. ホスティングの設定で、`/sw.js` と `/index.html` を `no-cache` にする。

注意：iOS はホーム画面のアイコンを強くキャッシュする。アイコンの中身からハッシュを作り、manifest と `apple-touch-icon` の URL に `?v=<ハッシュ>` を付けると、アイコンを変えたときに取り直される。
