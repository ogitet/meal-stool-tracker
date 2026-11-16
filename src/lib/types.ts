export type GroupId = "staple" | "protein" | "vegetable" | "other" | "sweets";
export type Slot = "breakfast" | "lunch" | "dinner" | "other";
export type Shape = "hard" | "normal" | "soft" | "diarrhea";
export type Amount = "small" | "normal" | "large";
export type Feeling = "clear" | "residual";

/** 暦日。"2026-11-10" 形式（端末のローカル時刻基準）。 */
export type DateKey = string;

export interface Category {
  id: string;
  name: string;
  abbr: string;
  group: GroupId;
  active: boolean;
  order: number;
}

export interface Meal {
  id: string;
  date: DateKey;
  slot: Slot;
  categoryIds: string[];
  createdAt: Date | null;
  updatedAt: Date | null;
  /** 端末に保存済みで、まだサーバーに届いていない（未同期） */
  pending?: boolean;
}

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
