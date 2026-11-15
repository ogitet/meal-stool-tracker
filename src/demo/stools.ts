import { useMemo } from "react";
import { toKey } from "@/lib/date";
import type { Amount, DateKey, Feeling, Shape, Stool } from "@/lib/types";
import type { RangeState } from "./meals";
import { emit, newId, store, useStoreVersion } from "./store";

export function useStoolsInRange(_uid: string, start: DateKey, end: DateKey): RangeState<Stool> {
  const v = useStoreVersion();
  return useMemo(
    () => ({
      items: store.stools
        .filter((s) => s.date >= start && s.date <= end)
        .sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime()),
      loading: false,
      error: null,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [v, start, end],
  );
}

export async function getStool(_uid: string, id: string): Promise<Stool | null> {
  return store.stools.find((s) => s.id === id) ?? null;
}

export interface StoolInput {
  occurredAt: Date;
  shape: Shape;
  amount?: Amount;
  feeling?: Feeling;
}

function toStool(id: string, input: StoolInput): Stool {
  const s: Stool = { id, date: toKey(input.occurredAt), occurredAt: input.occurredAt, shape: input.shape };
  if (input.amount) s.amount = input.amount;
  if (input.feeling) s.feeling = input.feeling;
  return s;
}

export async function createStool(_uid: string, input: StoolInput): Promise<string> {
  const id = newId("s");
  store.stools = [...store.stools, toStool(id, input)];
  emit();
  return id;
}

export async function updateStool(_uid: string, id: string, input: StoolInput): Promise<void> {
  store.stools = store.stools.map((s) => (s.id === id ? toStool(id, input) : s));
  emit();
}

export async function deleteStool(_uid: string, id: string): Promise<void> {
  store.stools = store.stools.filter((s) => s.id !== id);
  emit();
}
