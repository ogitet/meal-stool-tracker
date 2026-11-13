import { useMemo } from "react";
import { sortCategories } from "../lib/categories";
import type { Category, GroupId } from "../lib/types";
import { emit, newId, store, useStoreVersion } from "./store";

export interface CategoriesState {
  all: Category[];
  active: Category[];
  byId: Map<string, Category>;
  loading: boolean;
  error: string | null;
}

export function useCategories(_uid: string): CategoriesState {
  const v = useStoreVersion();
  return useMemo(() => {
    const all = sortCategories(store.categories);
    return {
      all,
      active: all.filter((c) => c.active),
      byId: new Map(all.map((c) => [c.id, c])),
      loading: false,
      error: null,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v]);
}

export async function addCategory(
  _uid: string,
  input: { name: string; abbr: string; group: GroupId },
  existing: Category[],
): Promise<void> {
  const order = existing.filter((c) => c.group === input.group).reduce((m, c) => Math.max(m, c.order), -1) + 1;
  store.categories = [...store.categories, { id: newId("c"), ...input, active: true, order }];
  emit();
}

export async function updateCategory(
  _uid: string,
  id: string,
  patch: Partial<Pick<Category, "name" | "abbr" | "group" | "active" | "order">>,
): Promise<void> {
  store.categories = store.categories.map((c) => (c.id === id ? { ...c, ...patch } : c));
  emit();
}

export function isDuplicateName(name: string, group: GroupId, existing: Category[], selfId?: string): boolean {
  const n = name.trim();
  return existing.some((c) => c.id !== selfId && c.group === group && c.name === n);
}
