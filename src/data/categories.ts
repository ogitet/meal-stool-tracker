import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  setDoc,
  updateDoc,
  writeBatch,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import { db } from "@/firebase";
import { DEFAULT_CATEGORIES } from "@/lib/constants";
import { sortCategories } from "@/lib/categories";
import type { Category, GroupId } from "@/lib/types";
import { guardedWrite } from "./write";

function col(uid: string) {
  return collection(db, "users", uid, "categories");
}

function fromDoc(d: QueryDocumentSnapshot<DocumentData>): Category {
  const v = d.data();
  return {
    id: d.id,
    name: String(v.name ?? ""),
    abbr: String(v.abbr ?? ""),
    group: v.group as GroupId,
    active: v.active !== false,
    order: typeof v.order === "number" ? v.order : 0,
  };
}

export interface CategoriesState {
  /** 全カテゴリ（使わないものを含む）。グループ順。 */
  all: Category[];
  active: Category[];
  byId: Map<string, Category>;
  loading: boolean;
  error: string | null;
}

/** カテゴリは件数が少ないので常時購読する。空なら初期カテゴリを投入する。 */
export function useCategories(uid: string): CategoriesState {
  const [all, setAll] = useState<Category[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let seeding = false;
    const unsub = onSnapshot(
      col(uid),
      (snap) => {
        if (snap.empty && !snap.metadata.fromCache && !seeding) {
          seeding = true;
          seedDefaults(uid).catch(() => setError("初期カテゴリを作成できませんでした"));
          return;
        }
        setAll(sortCategories(snap.docs.map(fromDoc)));
        setError(null);
      },
      () => setError("読み込めませんでした"),
    );
    return unsub;
  }, [uid]);

  return useMemo(() => {
    const list = all ?? [];
    return {
      all: list,
      active: list.filter((c) => c.active),
      byId: new Map(list.map((c) => [c.id, c])),
      loading: all === null && error === null,
      error,
    };
  }, [all, error]);
}

async function seedDefaults(uid: string): Promise<void> {
  // 別端末との競合に備え、投入直前にもう一度空かを確認する。
  const snap = await getDocs(col(uid));
  if (!snap.empty) return;
  const batch = writeBatch(db);
  for (const c of DEFAULT_CATEGORIES) {
    const { id, ...rest } = c;
    batch.set(doc(col(uid), id), { ...rest, active: true });
  }
  await guardedWrite(() => batch.commit());
}

export async function addCategory(
  uid: string,
  input: { name: string; abbr: string; group: GroupId },
  existing: Category[],
): Promise<void> {
  const inGroup = existing.filter((c) => c.group === input.group);
  const order = inGroup.reduce((m, c) => Math.max(m, c.order), -1) + 1;
  const ref = doc(col(uid));
  await guardedWrite(() => setDoc(ref, { ...input, active: true, order }));
}

export async function updateCategory(
  uid: string,
  id: string,
  patch: Partial<Pick<Category, "name" | "abbr" | "group" | "active" | "order">>,
): Promise<void> {
  await guardedWrite(() => updateDoc(doc(col(uid), id), patch));
}

/** 同じグループ内での名称の重複は保存できない（Structure 7章）。 */
export function isDuplicateName(name: string, group: GroupId, existing: Category[], selfId?: string): boolean {
  const n = name.trim();
  return existing.some((c) => c.id !== selfId && c.group === group && c.name === n);
}
