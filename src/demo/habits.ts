import { useMemo } from "react";
import { markId, nextItemOrder, sortItems } from "@/lib/items";
import type { DateKey, HabitItem, HabitKind, Mark } from "@/lib/types";
import { accept, newId, pendingIds, store, useStoreVersion } from "./store";

export interface HabitsState {
  all: HabitItem[];
  active: HabitItem[];
  byId: Map<string, HabitItem>;
  marks: Mark[];
  startDate: DateKey;
  loading: boolean;
  error: string | null;
  retry: () => void;
  migratedDays: number | null;
}

const noop = () => {};

/** デモは引き継ぎ済みの状態から始める。 */
export function useHabits(_uid: string): HabitsState {
  const v = useStoreVersion();
  return useMemo(() => {
    const all = sortItems(store.items);
    return {
      all,
      active: all.filter((i) => i.active),
      byId: new Map(all.map((i) => [i.id, i])),
      marks: store.marks.map((m) => (pendingIds.has(markId(m.date, m.itemId)) ? { ...m, pending: true } : m)),
      startDate: store.startDate,
      loading: false,
      error: null,
      retry: noop,
      migratedDays: null,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v]);
}

export function setMark(_uid: string, date: DateKey, itemId: string, on: boolean): void {
  const rest = store.marks.filter((m) => !(m.date === date && m.itemId === itemId));
  store.marks = on ? [...rest, { date, itemId }] : rest;
  accept(markId(date, itemId));
}

export async function addItem(
  _uid: string,
  input: { kind: HabitKind; name: string; abbr: string },
  existing: HabitItem[],
): Promise<void> {
  const id = newId("i");
  store.items = [...store.items, { id, ...input, active: true, order: nextItemOrder(existing, input.kind) }];
  accept(id);
}

export async function updateItem(
  _uid: string,
  id: string,
  patch: Partial<Pick<HabitItem, "name" | "abbr" | "active">>,
): Promise<void> {
  store.items = store.items.map((i) => (i.id === id ? { ...i, ...patch } : i));
  accept(id);
}
