# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

「ひびログ」: 減らしたい食べ物・運動・便を記録する個人用 PWA（React 19 + TypeScript + Vite+、Firebase Auth / Firestore / Hosting）。設計の経緯と決定は `docs/`（01 Strategy → 06 技術選定、wireframes.html）にある。01〜03 は第2版（習慣の記録）、04〜06 は初版の本文に第2版の章（04 は11章、05・06 は10章）を足した形で、食い違う部分は第2版の章を優先する。コード中の「Scope Q14」「06-tech 6章」などはこの文書の参照。コメント・UI・コミットメッセージは日本語。

## コマンド

ツールチェーンは Vite+（`vp`）。lint は oxlint、整形は oxfmt（幅 120）、テストは vitest 互換。HTML・JSX は markuplint、CSS は stylelint で別に検査する。Node の版は `.node-version` と `package.json` の `volta.node` の2か所に書き、一致をテストが検証する。

```bash
npm run dev            # :5173。.env.local に Firebase の設定が必要（項目は .env.example）
npm run demo           # :5199。例データで全画面を表示（Firebase 不要）
npm run storybook      # :6006
npm run check          # 整形・lint・型チェック（--fix で自動修正）。CI と同じ
npm run markuplint     # HTML・JSX の lint（コミット時と CI でも走る）
npm run stylelint      # CSS の lint（コミット時と CI でも走る。-- --fix で自動修正）
npm test               # 単体テスト（src/**/*.test.ts, scripts/**/*.test.ts）
npx vp test run src/lib/date.test.ts   # 単一ファイル
npm run test:rules     # firestore.rules のテスト（firestore-tests/。Firestore エミュレーターで実行、Java 21 以上が必要）
npm run test:e2e       # Playwright（demo サーバーを自動起動、Chromium と WebKit、375x667）
npx playwright test e2e/record.spec.ts --project=chromium -g "テスト名"   # 単一の E2E
npm run build          # dist/
```

E2E は初回のみ `npx playwright install chromium webkit`。E2E とルールのテストは PR の CI でも走る。`firestore.rules` を変えたら `firestore-tests/rules.test.ts` も直す。

markuplint は `index.html` と `src/**/*.tsx` が対象。JSX パーサーが TypeScript の JS API を使うため、TypeScript は 6 系に固定している（7 には JS API がない）。`<svg>` の直下に `{条件 && <要素 />}` を書くと誤検出するので、要素は変数や対応表に出す（`src/components/StoolMark.tsx`）。

stylelint は `src/**/*.css` が対象。ルールは `stylelint-config-standard` と、プロパティの並び順を決める `stylelint-config-recess-order`（設定は `.stylelintrc.json`）。recess-order が stylelint 18 に未対応のため、stylelint は 17 系、`stylelint-config-standard` は 40 系に留めている。対応したら2つを一緒に上げる。

## 運用

- `main` に直接コミット・プッシュしない。作業ブランチ → PR → CI（check・markuplint・stylelint・単体テスト・build・E2E・ルールのテスト）が通ったらユーザーがマージ。**マージで本番にデプロイされる**（`.github/workflows/deploy.yml`）。
- ワークフローの Actions はコミットの SHA で固定し、`GITHUB_TOKEN` は `contents: read` に絞っている。Actions と npm の更新は Dependabot（`.github/dependabot.yml`）が週次で PR を出す。Vite+（`vite`・`vite-plus`・`setup-vp`）は対象外で、手で版をそろえて上げる。TypeScript の major も対象外。
- コミット時に `.vite-hooks/pre-commit`（`vp staged`）が、ステージしたファイルに `vp check --fix` を、続けて CSS には stylelint、TSX と `index.html` には markuplint を実行する（`vite.config.ts` の `staged`）。エラーがあるとコミットできない。パターンは並行で走るため、同じファイルが2つのパターンに当たらないように分けている。

## アーキテクチャ

- **データ層の差し替え（デモモード）**: 画面は `src/data/{useAuth,habits,stools,sync}.ts`（Firestore 実装）だけに依存する。`mode === "demo"` のとき `src/demo/vite-plugin.ts` が、これらの import を同名の `src/demo/*`（メモリ内実装）に解決し直す。Storybook と E2E もこの仕組みで Firebase なしに動く。したがって **`src/data/` の公開 API を変えたら `src/demo/` の対応ファイルも同じ形に直す**。`src/demo/` 内からの import は差し替え対象外。
- **Firestore のモデル**: `users/{uid}/{items,marks,meta,stools}`。記録（marks）の文書IDは `{日付}_{項目}` で、押す＝作成、取り消す＝削除。初版の `categories`・`meals` は消さずに読み取りのみ許し、初回起動時の引き継ぎ（`src/data/habits.ts` の `migrate`）で読む。アクセス制限は `firestore.rules`、インデックスは `firestore.indexes.json`。ログイン後に `UserDataProvider`（`src/data/UserDataContext.tsx`）が項目・記録・設定を1回だけ購読し、全画面で共有する。数字（月の日数、連続日数、ベスト）は `src/lib/habits.ts` で計算する。
- **書き込みとオフライン**: Firestore のオフライン保存（`src/firebase.ts`）で、オフラインでも記録できる（Scope Q14、06-tech 6章）。書き込みは必ず `src/data/write.ts` の `queuedWrite` を通す。サーバーに届くのを待たずに戻り、未同期の有無と後から分かった失敗は `SyncNotice`（`src/components/`）が示す。そのため書き込みの Promise を `await` しない。1件の読み込みは `src/data/read.ts`（端末の保存分を先に見る）を使う。デモのデータ層（`src/demo/store.ts` の `accept`）も、オフラインの間の書き込みを未同期として扱う。
- **画面とルーティング**: `src/App.tsx` が `createBrowserRouter`（View Transitions に必要）で `src/screens/*` を配置。未ログインは `Login` のみ。画面は月カレンダー（日別と項目選びはその上のシート）、便記録、項目管理。純粋なロジック（日付・数字・項目）は `src/lib/` にあり、単体テストはここに置く。
- **import のパス**: `src/` 内でフォルダーをまたぐ import は `@/`（= `src/`）で書く。同じフォルダー内は `./`。`src/` で `../` を書くと lint がエラーにする。対応は `vite.config.ts` の `resolve.alias` と `tsconfig.app.json` の `paths` の2か所に書いている。設定ファイル（`vite.config.ts`、`.storybook/main.ts`）は Vite を通さずに読み込まれるため、相対パスのままにする。
- **配色**: 明るい配色と暗い配色を、端末の設定（`prefers-color-scheme`）で切り替える。色は `src/styles/global.css` の `:root` に `light-dark(明, 暗)` で書き、CSS や TSX に色を直接書かない（ビルドが古いブラウザー向けに変換する）。色を変えたら `src/styles/palette.test.ts`（コントラスト比）と `docs/05-surface.md` 2章の表も直す。`index.html` の `theme-color` と `e2e/theme.spec.ts` にも地の色を書いている。Storybook はツールバーの「配色」で切り替える（`:root[data-theme]`）。
- **アカウント**: アプリに登録画面はない。ユーザーは Firebase コンソールで追加する。
- **PWA**: `vite.config.ts` で vite-plugin-pwa を設定。アイコンの中身から版番号（`ICON_VERSION`）を作って URL に付け、iOS のキャッシュを回避する。Firestore の通信は SW でキャッシュしない。新しい版への切り替え（ページの読み直し）は、入力画面を離れ、未同期の書き込みがなくなるまで待つ（`src/pwa.ts`）。アイコンの再生成は `npm run icons`（`public/favicon.svg` と共有用の `public/og-image.png` も作る。og-image の文字は Playwright の Chromium と Google Fonts で描くため、ブラウザーの導入と通信が必要）。`index.html` の OGP と canonical には公開先の URL を直接書いている。
- **Storybook**: ストーリーは対象の隣（`*.stories.tsx`、画面は `src/screens/screens.stories.tsx`）。設定は `.storybook/`。

## 初回の Firebase 設定・デプロイ

手順は README.md を参照（Authentication のメール／パスワード有効化と新規登録のオフ、`firebase deploy --only firestore`、`npm run deploy`）。
