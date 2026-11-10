import { createContext, useContext, type ReactNode } from "react";
import { useCategories, type CategoriesState } from "./categories";

interface UserData {
  uid: string;
  categories: CategoriesState;
}

const Ctx = createContext<UserData | null>(null);

/** ログイン後に1回だけカテゴリを購読し、全画面で共有する。 */
export function UserDataProvider({ uid, children }: { uid: string; children: ReactNode }) {
  const categories = useCategories(uid);
  return <Ctx.Provider value={{ uid, categories }}>{children}</Ctx.Provider>;
}

export function useUserData(): UserData {
  const v = useContext(Ctx);
  if (!v) throw new Error("UserDataProvider の外で使われています");
  return v;
}
