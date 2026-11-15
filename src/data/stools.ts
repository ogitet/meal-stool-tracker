import {
  addDoc,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
  type DocumentData,
  type DocumentSnapshot,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import { db } from "@/firebase";
import { toKey } from "@/lib/date";
import type { Amount, DateKey, Feeling, Shape, Stool } from "@/lib/types";
import type { RangeState } from "./meals";
import { guardedWrite } from "./write";

function col(uid: string) {
  return collection(db, "users", uid, "stools");
}

function fromDoc(d: DocumentSnapshot<DocumentData>): Stool | null {
  const v = d.data();
  if (!v || !(v.occurredAt instanceof Timestamp)) return null;
  const s: Stool = {
    id: d.id,
    date: String(v.date),
    occurredAt: v.occurredAt.toDate(),
    shape: v.shape as Shape,
  };
  if (v.amount) s.amount = v.amount as Amount;
  if (v.feeling) s.feeling = v.feeling as Feeling;
  return s;
}

export function useStoolsInRange(uid: string, start: DateKey, end: DateKey): RangeState<Stool> {
  const [state, setState] = useState<RangeState<Stool>>({ items: [], loading: true, error: null });
  useEffect(() => {
    setState((s) => ({ ...s, loading: true, error: null }));
    const q = query(col(uid), where("date", ">=", start), where("date", "<=", end));
    return onSnapshot(
      q,
      (snap) => {
        const items = snap.docs
          .map(fromDoc)
          .filter((s): s is Stool => s !== null)
          .sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());
        setState({ items, loading: false, error: null });
      },
      () => setState({ items: [], loading: false, error: "読み込めませんでした" }),
    );
  }, [uid, start, end]);
  return state;
}

export async function getStool(uid: string, id: string): Promise<Stool | null> {
  const snap = await getDoc(doc(col(uid), id));
  return fromDoc(snap);
}

export interface StoolInput {
  occurredAt: Date;
  shape: Shape;
  amount?: Amount;
  feeling?: Feeling;
}

export async function createStool(uid: string, input: StoolInput): Promise<string> {
  const data: Record<string, unknown> = {
    date: toKey(input.occurredAt),
    occurredAt: Timestamp.fromDate(input.occurredAt),
    shape: input.shape,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  if (input.amount) data.amount = input.amount;
  if (input.feeling) data.feeling = input.feeling;
  const ref = await guardedWrite(() => addDoc(col(uid), data));
  return ref.id;
}

export async function updateStool(uid: string, id: string, input: StoolInput): Promise<void> {
  await guardedWrite(() =>
    updateDoc(doc(col(uid), id), {
      date: toKey(input.occurredAt),
      occurredAt: Timestamp.fromDate(input.occurredAt),
      shape: input.shape,
      amount: input.amount ?? deleteField(),
      feeling: input.feeling ?? deleteField(),
      updatedAt: serverTimestamp(),
    }),
  );
}

export async function deleteStool(uid: string, id: string): Promise<void> {
  await guardedWrite(() => deleteDoc(doc(col(uid), id)));
}
