import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { deleteDoc, doc, getDoc, setDoc, Timestamp, updateDoc } from "firebase/firestore";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vite-plus/test";

/**
 * firestore.rules のテスト。Firestore エミュレーターに対して実行する（`npm run test:rules`）。
 * 「本人の領域だけを読み書きできる」「決めた形のデータだけを保存できる」を確かめる。
 */
const ME = "me";
const OTHER = "other";

let env: RulesTestEnvironment;

beforeAll(async () => {
  // 接続先は、emulators:exec が設定する FIRESTORE_EMULATOR_HOST から決まる
  expect(process.env.FIRESTORE_EMULATOR_HOST, "npm run test:rules から実行する").toBeTruthy();
  env = await initializeTestEnvironment({
    projectId: "demo-hibi-log",
    firestore: { rules: readFileSync("firestore.rules", "utf8") },
  });
});

beforeEach(async () => {
  await env.clearFirestore();
});

afterAll(async () => {
  await env?.cleanup();
});

/** ME としてログインした状態の Firestore */
const mine = () => env.authenticatedContext(ME).firestore();
/** 別の利用者としてログインした状態の Firestore */
const others = () => env.authenticatedContext(OTHER).firestore();
/** 未ログインの Firestore */
const anonymous = () => env.unauthenticatedContext().firestore();

/** ルールを通さずに、テストの前提となるデータを置く */
async function seed(path: string, data: Record<string, unknown>): Promise<void> {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), path), data);
  });
}

const category = { name: "ごはん", abbr: "ご", group: "staple", active: true, order: 0 };
const meal = { date: "2026-11-13", slot: "breakfast", categoryIds: ["c1"] };
const stool = {
  date: "2026-11-13",
  occurredAt: Timestamp.fromDate(new Date("2026-11-13T07:30:00+09:00")),
  shape: "normal",
};

describe.each([
  ["categories", category],
  ["meals", meal],
  ["stools", stool],
])("%s: 本人だけが読み書きできる", (name, data) => {
  const path = `users/${ME}/${name}/x`;

  it("本人は作成・取得できる", async () => {
    await assertSucceeds(setDoc(doc(mine(), path), data));
    await assertSucceeds(getDoc(doc(mine(), path)));
  });

  it("別の利用者は取得も作成もできない", async () => {
    await seed(path, data);
    await assertFails(getDoc(doc(others(), path)));
    await assertFails(setDoc(doc(others(), path), data));
  });

  it("未ログインでは取得も作成もできない", async () => {
    await seed(path, data);
    await assertFails(getDoc(doc(anonymous(), path)));
    await assertFails(setDoc(doc(anonymous(), path), data));
  });
});

describe("定義していない場所", () => {
  it("users の外や、users/{uid} 直下には、ログインしていても読み書きできない", async () => {
    await assertFails(setDoc(doc(mine(), "misc/x"), { a: 1 }));
    await assertFails(setDoc(doc(mine(), `users/${ME}`), { a: 1 }));
    await assertFails(getDoc(doc(mine(), `users/${ME}/unknown/x`)));
  });
});

describe("categories の値", () => {
  const path = `users/${ME}/categories/x`;

  it.each([
    ["名称が空", { name: "" }],
    ["名称が11文字", { name: "あ".repeat(11) }],
    ["名称が文字列でない", { name: 1 }],
    ["略称が空", { abbr: "" }],
    ["決めていないグループ", { group: "drink" }],
    ["active が真偽値でない", { active: "yes" }],
    ["order が数値でない", { order: "0" }],
  ])("%s は保存できない", async (_label, patch) => {
    await assertFails(setDoc(doc(mine(), path), { ...category, ...patch }));
  });

  it("名称は10文字まで保存できる", async () => {
    await assertSucceeds(setDoc(doc(mine(), path), { ...category, name: "あ".repeat(10) }));
  });

  it("「使わない」への変更はできるが、削除はできない（Scope Q7）", async () => {
    await seed(path, category);
    await assertSucceeds(updateDoc(doc(mine(), path), { active: false }));
    await assertFails(deleteDoc(doc(mine(), path)));
  });
});

describe("meals の値", () => {
  const path = `users/${ME}/meals/x`;

  it.each([
    ["日付の形式が違う", { date: "2026/11/13" }],
    ["日付が文字列でない", { date: 20261113 }],
    ["決めていない時間帯", { slot: "snack" }],
    ["カテゴリが空", { categoryIds: [] }],
    ["カテゴリが配列でない", { categoryIds: "c1" }],
  ])("%s は保存できない", async (_label, patch) => {
    await assertFails(setDoc(doc(mine(), path), { ...meal, ...patch }));
  });

  it("更新で不正な値にはできない", async () => {
    await seed(path, meal);
    await assertFails(updateDoc(doc(mine(), path), { categoryIds: [] }));
    await assertSucceeds(updateDoc(doc(mine(), path), { categoryIds: ["c1", "c2"] }));
  });

  it("本人は削除できる。別の利用者は削除できない", async () => {
    await seed(path, meal);
    await assertFails(deleteDoc(doc(others(), path)));
    await assertSucceeds(deleteDoc(doc(mine(), path)));
  });
});

describe("stools の値", () => {
  const path = `users/${ME}/stools/x`;

  it.each([
    ["日付の形式が違う", { date: "11-13" }],
    ["時刻が timestamp でない", { occurredAt: "2026-11-13T07:30:00" }],
    ["決めていない形", { shape: "unknown" }],
    ["決めていない量", { amount: "huge" }],
    ["決めていない感覚", { feeling: "good" }],
  ])("%s は保存できない", async (_label, patch) => {
    await assertFails(setDoc(doc(mine(), path), { ...stool, ...patch }));
  });

  it("量と感覚は、あってもなくても保存できる", async () => {
    await assertSucceeds(setDoc(doc(mine(), path), stool));
    await assertSucceeds(setDoc(doc(mine(), path), { ...stool, amount: "large", feeling: "residual" }));
  });

  it("本人は削除できる。別の利用者は削除できない", async () => {
    await seed(path, stool);
    await assertFails(deleteDoc(doc(others(), path)));
    await assertSucceeds(deleteDoc(doc(mine(), path)));
  });
});
