import type { CSSProperties } from "react";
import { GROUP_LABEL } from "../lib/constants";
import type { Category } from "../lib/types";

/** 印（カテゴリ）。1文字の略称をグループのインク色で示す（Skeleton 3章）。 */
export function Tile({
  category,
  groupEnd = false,
  index = 0,
}: {
  category: Category;
  groupEnd?: boolean;
  index?: number;
}) {
  return (
    <span
      className={`t g-${category.group}${groupEnd ? " ge" : ""}`}
      style={{ "--i": index } as CSSProperties}
      title={`${GROUP_LABEL[category.group]}：${category.name}`}
      aria-label={category.name}
    >
      {category.abbr}
    </span>
  );
}

/** グループ順に並んだカテゴリを、グループの境目に隙間を入れて描く（折り返しても字下げにならないよう、末尾側に空ける）。 */
export function TileRow({ categories }: { categories: Category[] }) {
  return (
    <>
      {categories.map((c, i) => {
        const next = categories[i + 1];
        return <Tile key={c.id} category={c} index={i} groupEnd={!!next && next.group !== c.group} />;
      })}
    </>
  );
}
