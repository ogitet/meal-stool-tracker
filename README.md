# ひびログ

食事と便を数タップで記録し、カレンダーで振り返るための個人用 PWA。
設計の経緯と決定は [docs/](docs/) にある（01 Strategy → 06 技術選定、wireframes.html）。

## 構成

- React 19 + TypeScript + Vite、PWA（vite-plugin-pwa）
- Firebase：Authentication（メール／パスワード）、Cloud Firestore、Hosting
- データは `users/{uid}/{categories,meals,stools}`。アクセス制限は `firestore.rules`

## 開発

```bash
cp .env.example .env.local   # Firebase の設定値を記入
npm install
npm run dev                  # http://localhost:5173
npm run demo                 # http://localhost:5199 例データで全画面を表示（Firebase 不要、デザイン確認用）
npm run storybook            # http://localhost:6006 部品と画面のカタログ（Storybook。例データで表示、Firebase 不要）
npm run build-storybook      # storybook-static/ に静的な Storybook を出力
npm run check                # 整形・lint・型チェック（vp check。--fix で自動修正）
npm run fmt                  # 整形（oxfmt）
npm test                     # 単体テスト（日付・カテゴリの関数、Node の版の一致）
npm run test:e2e             # 画面の E2E テスト（Playwright。例データの画面を Chromium と WebKit で操作）
npm run test:e2e:ui          # 同上を、操作の様子を見ながら実行
npm run build                # dist/ に出力
```

E2E テストを初めて実行する前に、ブラウザを取得する（1回だけ）。

```bash
npx playwright install chromium webkit
```

## 開発の流れ

`main` には直接コミット・プッシュしない（GitHub の無料プランでは非公開リポジトリのブランチ保護が効かないため、運用の約束とする）。

1. 作業用のブランチを作り、コミットしてプッシュする。コミットのとき、ステージしたファイルが自動で整形・lint される（`.vite-hooks/pre-commit` の `vp staged`。`npm install` で有効になる）。lint や型のエラーがあるとコミットできない。
2. PR を作る前に、手元で E2E テスト（`npm run test:e2e`）を実行する。時間がかかるため CI では実行しない。
3. `main` への PR を作る。PR で CI（整形・lint・型、単体テスト、ビルド）が走る（[ci.yml](.github/workflows/ci.yml)）。
4. CI が通ったことを確かめてマージする。マージすると本番にデプロイされる（[deploy.yml](.github/workflows/deploy.yml)）。

## 初回の Firebase 設定

1. Authentication で「メール／パスワード」を有効にし、**ユーザー** タブから本人のアカウントを追加する。
2. Authentication > 設定 > ユーザーアクション で「作成（登録）を有効にする」を**オフ**にする（アプリに登録画面はない）。
3. Firebase CLI を入れてログインし、ルールとインデックスを反映する。

```bash
npm install -g firebase-tools
firebase login
firebase deploy --only firestore
```

4. ホスティングへ公開する。

```bash
npm run deploy
```

初回ログイン時にカテゴリが空なら、初期の26種が自動で作成される。

## Node のバージョン

26.13.1 に固定している。次の2か所に同じ版を書く。**Node を上げるときは、両方を変える**（ずれると `npm test` が失敗する）。

- `.node-version`：CI（`setup-vp`）が読む
- `package.json` の `volta.node`：手元の Volta が読む（`volta install node@<版>` も実行する）
