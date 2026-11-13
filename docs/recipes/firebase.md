# レシピ：Firebase（Auth / Firestore / Hosting）を足す

このリポジトリの Firebase の構成を、別のプロジェクト（`app-template` から作ったものを想定）に足す手順。具体的なコードは、このリポジトリの該当ファイルを手本にする。

## 1. 依存とスクリプト

- `dependencies` に `firebase`、`devDependencies` に `firebase-tools` と `@firebase/rules-unit-testing` を足す。
- `firebase` と `@firebase/rules-unit-testing` は peer の関係にあるため、major は同時に上げる。`.github/dependabot.yml` の `groups` に次を足す。

  ```yaml
  firebase:
    patterns: ["firebase", "@firebase/*"]
  ```

- `package.json` の `scripts` に足す。

  ```json
  "test:rules": "firebase emulators:exec --only firestore --project demo-<名前> \"vp test run --config firestore-tests/vite.config.ts\"",
  "deploy": "npm run build && firebase deploy"
  ```

- `.gitignore` に `.firebase/`、`firebase-debug.log`、`firestore-debug.log` を足す。

## 2. 設定ファイル

- `.firebaserc`、`firebase.json`（firestore、hosting、emulators）、`firestore.rules`、`firestore.indexes.json` を置く。
- Hosting は `dist` を公開し、全パスを `/index.html` に書き換える。`/index.html` は `no-cache`、`/assets/**` は長期キャッシュにする。
- `src/firebase.ts` で初期化する。設定値は `VITE_FIREBASE_*` の環境変数から読み、未設定なら起動時にエラーにする。`src/vite-env.d.ts` に `ImportMetaEnv` の型を足す。
- 手元の設定値は `.env.local` に書く（コミットしない）。項目名だけを書いた `.env.example` をコミットしておく。

## 3. データ層

- `src/data/useAuth.ts`（`useAuth`、`login`、`logout`、`loginErrorMessage`）と、データごとのファイルを Firestore で実装する。モデルは `users/{uid}/{コレクション}`。
- 同じ公開 API の実装を `src/demo/` に置き、`src/demo/vite-plugin.ts` の正規表現に名前を足す。デモの `useAuth` は、常にログイン済みのユーザーを返す。
- 書き込みは `src/data/write.ts` の `guardedWrite` を通す。Firestore の書き込みは通信できないと完了を待ち続けるため、オフラインの検知と8秒の時間上限で失敗にし、`writeErrorMessage` でトースト用の文言にする。
- `src/App.tsx` で、未ログインなら `Login` 画面だけを表示する。全画面で共有するデータは、ログイン後に Context で1回だけ購読する。
- アプリに登録画面を作らない場合、ユーザーは Firebase コンソールで追加し、Authentication の設定で新規登録をオフにする。

## 4. ルールのテスト

- `firestore-tests/rules.test.ts`、`firestore-tests/vite.config.ts`、`firestore-tests/tsconfig.json` を置く。通常の単体テストとは設定を分ける（エミュレーターが要るため）。
- 「本人の領域だけを読み書きできる」「決めた形のデータだけを保存できる」を確かめる。`firestore.rules` を変えたら、テストも直す。
- 実行には Java 21 以上が必要。

## 5. CI とデプロイ

- `.github/workflows/ci.yml` に `rules` ジョブを足す（`actions/setup-java` で Java 21、`npm run test:rules`）。
- `.github/workflows/deploy.yml` を足す。`main` への push で `vp check`、`vp test run`、`npm run deploy -- --non-interactive` を実行する。サービスアカウントの鍵と `VITE_FIREBASE_*` は GitHub の Secrets に置く。
- これ以降は **マージで本番にデプロイされる**。CLAUDE.md と README.md の「運用」にその旨を書く。

## 6. 文書

README.md に初回の設定手順（Authentication の有効化、`firebase deploy --only firestore`、`npm run deploy`）を、CLAUDE.md の「アーキテクチャ」に Firestore のモデルと書き込みの約束を書く。
