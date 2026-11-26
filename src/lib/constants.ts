import type { Amount, Feeling, Shape } from "./types";

export const SHAPES: Shape[] = ["hard", "normal", "soft", "diarrhea"];
export const SHAPE_LABEL: Record<Shape, string> = {
  hard: "硬い",
  normal: "普通",
  soft: "柔らかい",
  diarrhea: "下痢",
};

export const AMOUNTS: Amount[] = ["small", "normal", "large"];
export const AMOUNT_LABEL: Record<Amount, string> = { small: "少", normal: "普通", large: "多" };

export const FEELINGS: Feeling[] = ["clear", "residual"];
export const FEELING_LABEL: Record<Feeling, string> = { clear: "すっきり", residual: "残便感あり" };
