import { useMemo } from "react";
import type { DateKey, Meal, Slot } from "../lib/types";
import { emit, newId, store, useStoreVersion } from "./store";

export interface RangeState<T> {
  items: T[];
  loading: boolean;
  error: string | null;
}

export function fixedMealId(date: DateKey, slot: Exclude<Slot, "other">): string {
  return `${date}_${slot}`;
}

export function useMealsInRange(_uid: string, start: DateKey, end: DateKey): RangeState<Meal> {
  const v = useStoreVersion();
  return useMemo(
    () => ({ items: store.meals.filter((m) => m.date >= start && m.date <= end), loading: false, error: null }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [v, start, end],
  );
}

export async function getMeal(_uid: string, id: string): Promise<Meal | null> {
  return store.meals.find((m) => m.id === id) ?? null;
}

export async function createMeal(_uid: string, date: DateKey, slot: Slot, categoryIds: string[]): Promise<string> {
  const id = slot === "other" ? newId("m") : fixedMealId(date, slot);
  const now = new Date();
  store.meals = [
    ...store.meals.filter((m) => m.id !== id),
    { id, date, slot, categoryIds, createdAt: now, updatedAt: now },
  ];
  emit();
  return id;
}

export async function updateMealCategories(_uid: string, id: string, categoryIds: string[]): Promise<void> {
  store.meals = store.meals.map((m) => (m.id === id ? { ...m, categoryIds, updatedAt: new Date() } : m));
  emit();
}

export async function deleteMeal(_uid: string, id: string): Promise<void> {
  store.meals = store.meals.filter((m) => m.id !== id);
  emit();
}

export async function findPreviousMeal(
  _uid: string,
  slot: Exclude<Slot, "other">,
  beforeDate: DateKey,
): Promise<Meal | null> {
  const list = store.meals
    .filter((m) => m.slot === slot && m.date < beforeDate)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
  return list[0] ?? null;
}
