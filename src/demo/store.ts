/**
 * デモモード（`npm run demo`）専用のメモリ内データ。
 * Firebase に接続せずに全画面を描画し、デザインの確認やスクリーンショットに使う。
 * vite.config.ts が src/data/* の読み込みを src/demo/* に差し替える。本番ビルドには含まれない。
 */
import { useEffect, useState } from "react";
import { addDays } from "date-fns";
import { isOnline, queuedWrite } from "@/data/write";
import { DEFAULT_ITEMS } from "@/lib/items";
import { toKey } from "@/lib/date";
import type { DateKey, HabitItem, Mark, Shape, Stool } from "@/lib/types";

const listeners = new Set<() => void>();

export const store: { items: HabitItem[]; marks: Mark[]; stools: Stool[]; startDate: DateKey } = {
  items: DEFAULT_ITEMS.map((i) => ({ ...i })),
  marks: [],
  stools: [],
  startDate: "",
};

export function emit(): void {
  listeners.forEach((l) => l());
}

/** ストアの変更で再描画する。 */
export function useStoreVersion(): number {
  const [v, setV] = useState(0);
  useEffect(() => {
    const l = () => setV((x) => x + 1);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);
  return v;
}

/** オフラインの間に受け付けた記録の ID（未同期）。通信が戻ると空にする。 */
export const pendingIds = new Set<string>();
let reconnect: Promise<void> | null = null;

/**
 * 書き込みを受け付ける。Firestore 実装と同じく、オフラインでもメモリ内にはすぐ反映し、
 * 通信が戻るまで未同期として数える（E2E でオフラインの表示を確かめるため）。
 */
export function accept(id: string): void {
  if (!isOnline()) {
    pendingIds.add(id);
    reconnect ??= new Promise<void>((resolve) => {
      window.addEventListener(
        "online",
        () => {
          reconnect = null;
          pendingIds.clear();
          resolve();
          emit();
        },
        { once: true },
      );
    });
    const wait = reconnect;
    queuedWrite(() => wait);
  }
  emit();
}

let seq = 0;
export function newId(prefix: string): string {
  seq += 1;
  return `${prefix}${seq}`;
}

// ---- 表示確認用の例データ ----
/** 便：今日から何日前に、どの形状を記録したか。 */
const STOOLS: Shape[][] = [
  ["normal"],
  ["normal"],
  ["diarrhea", "soft", "normal"],
  ["normal"],
  ["soft"],
  [],
  ["normal", "normal"],
  ["hard"],
  ["normal"],
  ["normal", "soft"],
  ["normal"],
  ["soft"],
  ["normal"],
  ["hard"],
];

/** 減らしたいもの：今日から何日前に何を食べたか。先月は多く、今月は減ってきた様子。 */
const EATEN: Record<number, string[]> = {
  2: ["bread", "sweets"],
  6: ["sweets"],
  17: ["bread"],
  23: ["bread", "sweets"],
  27: ["sweets"],
  29: ["bread"],
  31: ["bread", "sweets"],
  33: ["sweets"],
  34: ["bread"],
  37: ["bread"],
  38: ["sweets"],
  41: ["bread", "sweets"],
  43: ["sweets"],
  44: ["bread"],
  47: ["bread"],
  50: ["sweets"],
  52: ["bread", "sweets"],
  55: ["bread"],
};

/** 運動：今日から何日前にやったか。今日はまだ。 */
const EXERCISED = [
  1, 2, 3, 4, 5, 6, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 25, 26, 28, 30, 33, 34, 36, 40, 45, 48, 51,
];

/** 起点日（Scope Q52）：今日の56日前 */
const START_OFFSET = 56;

function seed(): void {
  const now = new Date();
  const key = (n: number) => toKey(addDays(now, -n));
  store.startDate = key(START_OFFSET);
  for (const [n, ids] of Object.entries(EATEN)) for (const itemId of ids) store.marks.push({ date: key(+n), itemId });
  for (const n of EXERCISED) store.marks.push({ date: key(n), itemId: "exercise" });
  STOOLS.forEach((shapes, i) => {
    const d = addDays(now, -i);
    shapes.forEach((shape, k) => {
      const occurredAt = new Date(d);
      occurredAt.setHours(8 + k * 5, 10, 0, 0);
      store.stools.push({
        id: newId("s"),
        date: toKey(d),
        occurredAt,
        shape,
        ...(k === 0 ? { amount: "large" as const, feeling: "clear" as const } : {}),
      });
    });
  });
  // 「使わない」項目の表示例
  store.items.push({ id: "demo_ramen", kind: "reduce", name: "ラーメン", abbr: "ラ", active: false, order: 2 });
}
seed();
