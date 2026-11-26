export type Shape = "hard" | "normal" | "soft" | "diarrhea";
export type Amount = "small" | "normal" | "large";
export type Feeling = "clear" | "residual";

/** 暦日。"2026-11-10" 形式（端末のローカル時刻基準）。 */
export type DateKey = string;

export interface Stool {
  id: string;
  date: DateKey;
  occurredAt: Date;
  shape: Shape;
  amount?: Amount;
  feeling?: Feeling;
  /** 端末に保存済みで、まだサーバーに届いていない（未同期） */
  pending?: boolean;
}

/** 減らしたいもの（reduce）と続けたいこと（keep）。各1つで固定（Scope Q59）。 */
export type HabitKind = "reduce" | "keep";

/** 減らしたいもの・続けたいことの項目（Scope F-15）。 */
export interface HabitItem {
  id: string;
  kind: HabitKind;
  name: string;
  /** カレンダーの印に使う1文字 */
  abbr: string;
  active: boolean;
  order: number;
}

/** 「その日にその項目が起きた」の記録。同じ日の同じ項目は1件（Scope Q51）。 */
export interface Mark {
  date: DateKey;
  itemId: string;
  /** 端末に保存済みで、まだサーバーに届いていない（未同期） */
  pending?: boolean;
}

/** 期間の読み込みの状態。 */
export interface RangeState<T> {
  items: T[];
  loading: boolean;
  error: string | null;
}
