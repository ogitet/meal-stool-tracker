import { defineConfig } from "vite-plus";

// firestore.rules のテスト（`npm run test:rules`）。Firestore エミュレーターが要るため、
// 通常の単体テスト（`npm test`）とは設定を分ける。
export default defineConfig({
  test: {
    environment: "node",
    include: ["firestore-tests/**/*.test.ts"],
  },
});
