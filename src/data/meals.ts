import {
  collection,
  deleteDoc,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  type DocumentData,
  type DocumentSnapshot,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import { db } from "@/firebase";
import type { DateKey, Meal, Slot } from "@/lib/types";
import { ESTIMATE, getDocCacheFirst, getDocsOfflineAware } from "./read";
import { queuedWrite } from "./write";

function col(uid: string) {
  return collection(db, "users", uid, "meals");
}

/** 朝食・昼食・夕食は「日付_枠」を文書IDにして1日1件を保証する（06-tech 4章）。 */
export function fixedMealId(date: DateKey, slot: Exclude<Slot, "other">): string {
  return `${date}_${slot}`;
}

function toDate(v: unknown): Date | null {
  return v instanceof Timestamp ? v.toDate() : null;
}

function fromDoc(d: DocumentSnapshot<DocumentData>): Meal | null {
  const v = d.data(ESTIMATE);
  if (!v) return null;
  return {
    id: d.id,
    date: String(v.date),
    slot: v.slot as Slot,
    categoryIds: Array.isArray(v.categoryIds) ? v.categoryIds.map(String) : [],
    createdAt: toDate(v.createdAt),
    updatedAt: toDate(v.updatedAt),
    ...(d.metadata.hasPendingWrites ? { pending: true } : {}),
  };
}

export interface RangeState<T> {
  items: T[];
  loading: boolean;
  error: string | null;
}

/** 期間内の食事を購読する（カレンダー、日別詳細）。 */
export function useMealsInRange(uid: string, start: DateKey, end: DateKey): RangeState<Meal> {
  const [state, setState] = useState<RangeState<Meal>>({ items: [], loading: true, error: null });
  useEffect(() => {
    setState((s) => ({ ...s, loading: true, error: null }));
    const q = query(col(uid), where("date", ">=", start), where("date", "<=", end));
    // 未同期の印（pending）を外すため、サーバーに届いたときの変化も受け取る
    return onSnapshot(
      q,
      { includeMetadataChanges: true },
      (snap) => {
        const items = snap.docs.map(fromDoc).filter((m): m is Meal => m !== null);
        setState({ items, loading: false, error: null });
      },
      () => setState({ items: [], loading: false, error: "読み込めませんでした" }),
    );
  }, [uid, start, end]);
  return state;
}

export async function getMeal(uid: string, id: string): Promise<Meal | null> {
  const snap = await getDocCacheFirst(doc(col(uid), id));
  return snap ? fromDoc(snap) : null;
}

/** 新規作成。固定枠はIDを決めて上書き保存、その他の食事は自動ID。 */
export async function createMeal(uid: string, date: DateKey, slot: Slot, categoryIds: string[]): Promise<string> {
  const ref = slot === "other" ? doc(col(uid)) : doc(col(uid), fixedMealId(date, slot));
  queuedWrite(() =>
    setDoc(ref, { date, slot, categoryIds, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }),
  );
  return ref.id;
}

export async function updateMealCategories(uid: string, id: string, categoryIds: string[]): Promise<void> {
  queuedWrite(() => updateDoc(doc(col(uid), id), { categoryIds, updatedAt: serverTimestamp() }));
}

export async function deleteMeal(uid: string, id: string): Promise<void> {
  queuedWrite(() => deleteDoc(doc(col(uid), id)));
}

/**
 * 前回のコピー：対象の日より前で最も新しい同じ枠の記録（Scope F-09）。
 * 複合インデックス（slot ASC, date DESC）が必要。firestore.indexes.json を参照。
 */
export async function findPreviousMeal(
  uid: string,
  slot: Exclude<Slot, "other">,
  beforeDate: DateKey,
): Promise<Meal | null> {
  const q = query(
    col(uid),
    where("slot", "==", slot),
    where("date", "<", beforeDate),
    orderBy("date", "desc"),
    limit(1),
  );
  const snap = await getDocsOfflineAware(q);
  const first = snap.docs[0];
  return first ? fromDoc(first) : null;
}
