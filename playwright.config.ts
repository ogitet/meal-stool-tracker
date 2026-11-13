import { defineConfig, devices } from "@playwright/test";

/**
 * 画面の E2E テスト（`npm run test:e2e`）。
 * デモモード（例データ、Firebase に接続しない）の画面を、iPhone SE 相当の大きさで操作する。
 * 例データはページを開くたびに初期状態へ戻るため、テスト同士は影響しない。
 */
const viewport = { width: 375, height: 667 };

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://localhost:5199",
    locale: "ja-JP",
    timezoneId: "Asia/Tokyo",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"], viewport, deviceScaleFactor: 2 } },
    // iPhone の Safari と同じ描画エンジン
    { name: "webkit", use: { ...devices["Desktop Safari"], viewport, deviceScaleFactor: 2 } },
  ],
  webServer: {
    command: "npm run demo",
    url: "http://localhost:5199",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
