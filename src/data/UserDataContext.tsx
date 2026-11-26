import { createContext, useContext, type ReactNode } from "react";
import { useHabits, type HabitsState } from "./habits";

interface UserData {
  uid: string;
  habits: HabitsState;
}

const Ctx = createContext<UserData | null>(null);

/** ログイン後に1回だけ項目と記録を購読し、全画面で共有する（06-tech Q71）。 */
export function UserDataProvider({ uid, children }: { uid: string; children: ReactNode }) {
  const habits = useHabits(uid);
  return <Ctx.Provider value={{ uid, habits }}>{children}</Ctx.Provider>;
}

export function useUserData(): UserData {
  const v = useContext(Ctx);
  if (!v) throw new Error("UserDataProvider の外で使われています");
  return v;
}
