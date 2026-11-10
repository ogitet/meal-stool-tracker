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
npm test                     # 日付・カテゴリの純粋関数のテスト
npm run build                # dist/ に出力
```

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
