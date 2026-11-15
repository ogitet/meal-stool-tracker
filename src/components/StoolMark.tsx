import type { ReactNode } from "react";
import { SHAPE_LABEL } from "../lib/constants";
import type { Shape } from "../lib/types";

/** 形ごとの図形。<svg> の直下に条件式で要素を書くと markuplint が誤検出するため、対応表にしている。 */
const MARKS: Record<Shape, ReactNode> = {
  hard: (
    <>
      <circle cx="5" cy="12" r="3.2" fill="currentColor" />
      <circle cx="13" cy="12" r="3.2" fill="currentColor" />
      <circle cx="9" cy="5" r="3.2" fill="currentColor" />
    </>
  ),
  normal: <ellipse cx="9" cy="9" rx="8" ry="5" fill="currentColor" />,
  soft: (
    <>
      <circle cx="6" cy="10.5" r="4" fill="currentColor" />
      <circle cx="10.5" cy="8.5" r="4.5" fill="currentColor" />
      <circle cx="14" cy="11.5" r="3" fill="currentColor" />
      <rect x="2" y="11" width="15" height="3.5" rx="1.5" fill="currentColor" />
    </>
  ),
  diarrhea: <path d="M9 1.5C9 1.5 3.5 8.2 3.5 11.3a5.5 5.5 0 0 0 11 0C14.5 8.2 9 1.5 9 1.5Z" fill="currentColor" />,
};

/** 便マーク4種（Surface 3章）。輪郭の形に加え、茶色の濃淡（硬い=濃→下痢=黄土）でも区別する。 */
export function StoolMark({ shape, size = 18, color }: { shape: Shape; size?: number; color?: string }) {
  return (
    <svg
      className={`mk mk-${shape}`}
      width={size}
      height={size}
      viewBox="0 0 18 18"
      role="img"
      aria-label={SHAPE_LABEL[shape]}
      style={color ? { color } : undefined}
    >
      {MARKS[shape]}
    </svg>
  );
}
