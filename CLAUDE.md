# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

「ひびログ」: 食事と便を記録する個人用 PWA（React 19 + TypeScript + Vite+、Firebase Auth / Firestore / Hosting）。設計の経緯と決定は `docs/`（01 Strategy → 06 技術選定、wireframes.html）にある。コード中の「Scope Q14」「06-tech 6章」などはこの文書の参照。コメント・UI・コミットメッセージは日本語。

## コマンド

ツールチェーンは Vite+（`vp`）。lint は oxlint、整形は oxfmt（幅 120）、テストは vitest 互換。Node の版は `.node-version` と `package.json` の `volta.node` の2か所に書き、一致をテストが検証する。

```bash
npm run dev            # :5173。.env.local に Firebase の設定が必要（README は .env.example を案内するが、リポジトリには無い）
npm run demo           # :5199。例データで全画面を表示（Firebase 不要）
npm run storybook      # :6006
npm run check          # 整形・lint・型チェック（--fix で自動修正）。CI と同じ
npm test               # 単体テスト（src/**/*.test.ts, scripts/**/*.test.ts）
npx vp test run src/lib/date.test.ts   # 単一ファイル
npm run test:rules     # firestore.rules のテスト（firestore-tests/。Firestore エミュレーターで実行、Java 21 以上が必要）
npm run test:e2e       # Playwright（demo サーバーを自動起動、Chromium と WebKit、375x667）
npx playwright test e2e/record.spec.ts --project=chromium -g "テスト名"   # 単一の E2E
npm run build          # dist/
```

E2E は初回のみ `npx playwright install chromium webkit`。E2E とルールのテストは PR の CI でも走る。`firestore.rules` を変えたら `firestore-tests/rules.test.ts` も直す。

## 運用

- `main` に直接コミット・プッシュしない。作業ブランチ → PR → CI（check・単体テスト・build・E2E・ルールのテスト）が通ったらユーザーがマージ。**マージで本番にデプロイされる**（`.github/workflows/deploy.yml`）。
- ワークフローの Actions はコミットの SHA で固定し、`GITHUB_TOKEN` は `contents: read` に絞っている。Actions と npm の更新は Dependabot（`.github/dependabot.yml`）が週次で PR を出す。Vite+（`vite`・`vite-plus`・`setup-vp`）は対象外で、手で版をそろえて上げる。
- コミット時に `.vite-hooks/pre-commit`（`vp staged` → `vp check --fix`）が走り、lint・型エラーがあるとコミットできない。

## アーキテクチャ

- **データ層の差し替え（デモモード）**: 画面は `src/data/{useAuth,categories,meals,stools}.ts`（Firestore 実装）だけに依存する。`mode === "demo"` のとき `src/demo/vite-plugin.ts` が、これらの import を同名の `src/demo/*`（メモリ内実装）に解決し直す。Storybook と E2E もこの仕組みで Firebase なしに動く。したがって **`src/data/` の公開 API を変えたら `src/demo/` の対応ファイルも同じ形に直す**。`src/demo/` 内からの import は差し替え対象外。
- **Firestore のモデル**: `users/{uid}/{categories,meals,stools}`。アクセス制限は `firestore.rules`、インデックスは `firestore.indexes.json`。ログイン後に `UserDataProvider`（`src/data/UserDataContext.tsx`）がカテゴリを1回だけ購読し、全画面で共有する。
- **書き込み**: オフライン記録は MVP の対象外。書き込みは必ず `src/data/write.ts` の `guardedWrite`（オフライン検知＋8秒のタイムアウト）を通し、`writeErrorMessage` でトースト用の文言にする。
- **画面とルーティング**: `src/App.tsx` が `createBrowserRouter`（View Transitions に必要）で `src/screens/*` を配置。未ログインは `Login` のみ。純粋なロジック（日付・カテゴリ）は `src/lib/` にあり、単体テストはここに置く。
- **アカウント**: アプリに登録画面はない。ユーザーは Firebase コンソールで追加する。
- **PWA**: `vite.config.ts` で vite-plugin-pwa を設定。アイコンの中身から版番号（`ICON_VERSION`）を作って URL に付け、iOS のキャッシュを回避する。Firestore の通信は SW でキャッシュしない。アイコンの再生成は `npm run icons`。
- **Storybook**: ストーリーは対象の隣（`*.stories.tsx`、画面は `src/screens/screens.stories.tsx`）。設定は `.storybook/`。

## 初回の Firebase 設定・デプロイ

手順は README.md を参照（Authentication のメール／パスワード有効化と新規登録のオフ、`firebase deploy --only firestore`、`npm run deploy`）。
