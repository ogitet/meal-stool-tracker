import {
  collection,
  deleteDoc,
  doc,
  getDocsFromServer,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { useCallback, useEffect, useMemo, useState } from "react";
import { db } from "@/firebase";
import { todayKey } from "@/lib/date";
import { DEFAULT_ITEMS, marksFromMeals, markId, nextItemOrder, sortItems } from "@/lib/items";
import type { DateKey, HabitItem, HabitKind, Mark } from "@/lib/types";
import { getDocsOfflineAware } from "./read";
import { queuedWrite } from "./write";

/**
 * 減らしたいもの・続けたいことの項目と記録（Scope F-12〜F-16、06-tech 10章）。
 * 項目・記録・設定を1回ずつ購読し、UserDataProvider で全画面に共有する。
 */

function itemsCol(uid: string) {
  return collection(db, "users", uid, "items");
}
function marksCol(uid: string) {
  return collection(db, "users", uid, "marks");
}
function metaDoc(uid: string) {
  return doc(db, "users", uid, "meta", "habits");
}

function itemFromDoc(d: QueryDocumentSnapshot<DocumentData>): HabitItem {
  const v = d.data();
  return {
    id: d.id,
    kind: v.kind === "keep" ? "keep" : "reduce",
    name: String(v.name ?? ""),
    abbr: String(v.abbr ?? ""),
    active: v.active !== false,
    order: typeof v.order === "number" ? v.order : 0,
  };
}

function markFromDoc(d: QueryDocumentSnapshot<DocumentData>): Mark {
  const v = d.data();
  return {
    date: String(v.date),
    itemId: String(v.itemId),
    ...(d.metadata.hasPendingWrites ? { pending: true } : {}),
  };
}

interface Meta {
  startDate: DateKey | null;
  migrated: boolean;
}

export interface HabitsState {
  /** 全項目（使わないものを含む）。減らしたいもの → 続けたいことの順。 */
  all: HabitItem[];
  active: HabitItem[];
  byId: Map<string, HabitItem>;
  marks: Mark[];
  /** 食べなかった日を数え始める日（Scope Q52） */
  startDate: DateKey;
  loading: boolean;
  error: string | null;
  /** 読み込みに失敗したあと、購読し直す。 */
  retry: () => void;
  /** この起動で初版の食事記録から引き継いだ日数（Structure Q68）。引き継がなかったら null。 */
  migratedDays: number | null;
}

export function useHabits(uid: string): HabitsState {
  const [items, setItems] = useState<HabitItem[] | null>(null);
  const [marks, setMarks] = useState<Mark[] | null>(null);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [migratedDays, setMigratedDays] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  // 購読はエラーで終わるため、再試行では購読を作り直す
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => {
    setError(null);
    setAttempt((n) => n + 1);
  }, []);

  useEffect(() => {
    const fail = () => setError("読み込めませんでした");
    let seeding = false;
    let migrating = false;
    const unsubs = [
      onSnapshot(
        itemsCol(uid),
        (snap) => {
          if (snap.empty && !snap.metadata.fromCache) {
            if (!seeding) {
              seeding = true;
              seedItems(uid).catch(() => setError("初期の項目を作成できませんでした"));
            }
            return;
          }
          setItems(sortItems(snap.docs.map(itemFromDoc)));
        },
        fail,
      ),
      onSnapshot(marksCol(uid), { includeMetadataChanges: true }, (snap) => setMarks(snap.docs.map(markFromDoc)), fail),
      // 端末の保存分からサーバーの内容に切り替わったときにも呼ばれるよう、メタデータの変化も受け取る
      onSnapshot(
        metaDoc(uid),
        { includeMetadataChanges: true },
        (snap) => {
          const v = snap.data();
          const m: Meta = {
            startDate: typeof v?.startDate === "string" ? v.startDate : null,
            migrated: v?.migrated === true,
          };
          setMeta(m);
          // 引き継ぎはサーバーの内容を見てから1回だけ行う。オフラインなら次の起動に回す（Structure 7章）
          if (!m.migrated && !snap.metadata.fromCache && !migrating) {
            migrating = true;
            migrate(uid).then(
              (days) => days > 0 && setMigratedDays(days),
              () => {
                migrating = false;
              },
            );
          }
        },
        fail,
      ),
    ];
    return () => unsubs.forEach((u) => u());
  }, [uid, attempt]);

  return useMemo(() => {
    const all = items ?? [];
    const list = marks ?? [];
    // 起点日がまだ決まっていない（引き継ぐ前、オフライン）ときは、最も古い記録の日か今日を使う
    const earliest = list.reduce<DateKey | null>((m, x) => (m === null || x.date < m ? x.date : m), null);
    return {
      all,
      active: all.filter((i) => i.active),
      byId: new Map(all.map((i) => [i.id, i])),
      marks: list,
      startDate: meta?.startDate ?? earliest ?? todayKey(),
      loading: (items === null || marks === null || meta === null) && error === null,
      error,
      retry,
      migratedDays,
    };
  }, [items, marks, meta, error, retry, migratedDays]);
}

async function seedItems(uid: string): Promise<void> {
  // 別端末との競合に備え、投入直前にもう一度空かを確認する。
  const snap = await getDocsOfflineAware(itemsCol(uid));
  if (!snap.empty) return;
  const batch = writeBatch(db);
  for (const { id, ...rest } of DEFAULT_ITEMS) batch.set(doc(itemsCol(uid), id), rest);
  queuedWrite(() => batch.commit());
}

/**
 * 初版の食事記録の引き継ぎ（Scope F-16、06-tech 10章）。サーバーから読めないときは例外になり、次の起動で再び試す。
 * 記録と設定を1回の一括書き込みで保存し、途中で失敗しても半端な状態を残さない。引き継いだ日数を返す。
 */
async function migrate(uid: string): Promise<number> {
  const [meals, bread, sweets] = await Promise.all([
    getDocsFromServer(collection(db, "users", uid, "meals")),
    getDocsFromServer(query(collection(db, "users", uid, "categories"), where("name", "==", "パン"))),
    getDocsFromServer(query(collection(db, "users", uid, "categories"), where("group", "==", "sweets"))),
  ]);
  const { marks, startDate } = marksFromMeals(
    meals.docs.map((d) => {
      const v = d.data();
      return { date: String(v.date), categoryIds: Array.isArray(v.categoryIds) ? v.categoryIds.map(String) : [] };
    }),
    new Set(["staple_bread", ...bread.docs.map((d) => d.id)]),
    new Set(sweets.docs.map((d) => d.id)),
  );
  const batch = writeBatch(db);
  for (const m of marks) {
    batch.set(doc(marksCol(uid), markId(m.date, m.itemId)), { ...m, createdAt: serverTimestamp() });
  }
  batch.set(metaDoc(uid), { startDate: startDate ?? todayKey(), migrated: true });
  queuedWrite(() => batch.commit());
  return new Set(marks.map((m) => m.date)).size;
}

/** 押す（on）・取り消す。押す＝文書の作成、取り消す＝削除（06-tech Q72）。 */
export function setMark(uid: string, date: DateKey, itemId: string, on: boolean): void {
  const ref = doc(marksCol(uid), markId(date, itemId));
  queuedWrite(() => (on ? setDoc(ref, { date, itemId, createdAt: serverTimestamp() }) : deleteDoc(ref)));
}

export async function addItem(
  uid: string,
  input: { kind: HabitKind; name: string; abbr: string },
  existing: HabitItem[],
): Promise<void> {
  const ref = doc(itemsCol(uid));
  queuedWrite(() => setDoc(ref, { ...input, active: true, order: nextItemOrder(existing, input.kind) }));
}

/** 種類は変えない（Structure Q70）。 */
export async function updateItem(
  uid: string,
  id: string,
  patch: Partial<Pick<HabitItem, "name" | "abbr" | "active">>,
): Promise<void> {
  queuedWrite(() => updateDoc(doc(itemsCol(uid), id), patch));
}
