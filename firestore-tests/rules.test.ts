import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { deleteDoc, deleteField, doc, getDoc, serverTimestamp, setDoc, Timestamp, updateDoc } from "firebase/firestore";
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

const item = { kind: "reduce", name: "パン", abbr: "パ", active: true, order: 0 };
const mark = { date: "2026-11-13", itemId: "bread" };
const meta = { startDate: "2026-11-01", migrated: true };
const stool = {
  date: "2026-11-13",
  occurredAt: Timestamp.fromDate(new Date("2026-11-13T07:30:00+09:00")),
  shape: "normal",
};

describe.each([
  ["items/x", item],
  ["marks/2026-11-13_bread", mark],
  ["meta/habits", meta],
  ["stools/x", stool],
])("%s: 本人だけが読み書きできる", (name, data) => {
  const path = `users/${ME}/${name}`;

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

describe("初版の categories・meals", () => {
  it.each(["categories", "meals"])("%s は本人が読めるが、書き込めない（06-tech Q73）", async (name) => {
    const path = `users/${ME}/${name}/x`;
    await seed(path, { a: 1 });
    await assertSucceeds(getDoc(doc(mine(), path)));
    await assertFails(getDoc(doc(others(), path)));
    await assertFails(setDoc(doc(mine(), path), { a: 2 }));
    await assertFails(deleteDoc(doc(mine(), path)));
  });
});

describe("items の値", () => {
  const path = `users/${ME}/items/x`;

  it.each([
    ["名称が空", { name: "" }],
    ["名称が11文字", { name: "あ".repeat(11) }],
    ["名称が文字列でない", { name: 1 }],
    ["略称が空", { abbr: "" }],
    ["略称が3文字", { abbr: "パンだ" }],
    ["決めていない種類", { kind: "other" }],
    ["active が真偽値でない", { active: "yes" }],
    ["order が数値でない", { order: "0" }],
    ["決めていないフィールド", { memo: "x" }],
  ])("%s は保存できない", async (_label, patch) => {
    await assertFails(setDoc(doc(mine(), path), { ...item, ...patch }));
  });

  it("名称は10文字まで保存できる", async () => {
    await assertSucceeds(setDoc(doc(mine(), path), { ...item, name: "あ".repeat(10) }));
  });

  it("「使わない」への変更はできるが、削除と種類の変更はできない", async () => {
    await seed(path, item);
    await assertSucceeds(updateDoc(doc(mine(), path), { active: false, name: "食パン" }));
    await assertFails(updateDoc(doc(mine(), path), { kind: "keep" }));
    await assertFails(deleteDoc(doc(mine(), path)));
  });
});

describe("marks の値", () => {
  const path = `users/${ME}/marks/2026-11-13_bread`;

  it.each([
    ["日付の形式が違う", { date: "2026/11/13" }],
    ["項目が文字列でない", { itemId: 1 }],
    ["文書IDと日付が合わない", { date: "2026-11-14" }],
    ["文書IDと項目が合わない", { itemId: "sweets" }],
    ["作成日時が timestamp でない", { createdAt: "2026-11-13" }],
    ["決めていないフィールド", { count: 2 }],
  ])("%s は保存できない", async (_label, patch) => {
    await assertFails(setDoc(doc(mine(), path), { ...mark, ...patch }));
  });

  it("画面と同じ形（サーバーの日時つき）で押せ、同じ内容の上書きと取り消しもできる", async () => {
    await assertSucceeds(setDoc(doc(mine(), path), { ...mark, createdAt: serverTimestamp() }));
    await assertSucceeds(setDoc(doc(mine(), path), { ...mark, createdAt: serverTimestamp() }));
    await assertSucceeds(deleteDoc(doc(mine(), path)));
  });

  it("別の利用者は取り消せない", async () => {
    await seed(path, mark);
    await assertFails(deleteDoc(doc(others(), path)));
  });
});

describe("meta の値", () => {
  it.each([
    ["起点日の形式が違う", { startDate: "11/01" }],
    ["migrated が真偽値でない", { migrated: "yes" }],
    ["決めていないフィールド", { memo: "x" }],
  ])("%s は保存できない", async (_label, patch) => {
    await assertFails(setDoc(doc(mine(), `users/${ME}/meta/habits`), { ...meta, ...patch }));
  });

  it("habits 以外の文書は作れない。削除もできない", async () => {
    await assertFails(setDoc(doc(mine(), `users/${ME}/meta/other`), meta));
    await seed(`users/${ME}/meta/habits`, meta);
    await assertFails(deleteDoc(doc(mine(), `users/${ME}/meta/habits`)));
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
    ["更新日時が timestamp でない", { updatedAt: "2026-11-13" }],
    ["決めていないフィールド", { memo: "x" }],
  ])("%s は保存できない", async (_label, patch) => {
    await assertFails(setDoc(doc(mine(), path), { ...stool, ...patch }));
  });

  it("画面と同じ形（サーバーの日時つき）で作成でき、量と感覚を消す更新もできる", async () => {
    await assertSucceeds(
      setDoc(doc(mine(), path), {
        ...stool,
        amount: "large",
        feeling: "clear",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
    );
    await assertSucceeds(
      updateDoc(doc(mine(), path), {
        ...stool,
        amount: deleteField(),
        feeling: deleteField(),
        updatedAt: serverTimestamp(),
      }),
    );
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
