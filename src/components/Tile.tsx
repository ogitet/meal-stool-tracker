import { GROUP_LABEL } from "../lib/constants";
import type { Category } from "../lib/types";

/** カレンダーのカテゴリ印（Skeleton 3章）。1文字の略称をグループ色のタイルに。 */
export function Tile({ category, groupStart = false }: { category: Category; groupStart?: boolean }) {
  return (
    <span
      className={`t g-${category.group}${groupStart ? " gs" : ""}`}
      title={`${GROUP_LABEL[category.group]}：${category.name}`}
      aria-label={category.name}
    >
      {category.abbr}
    </span>
  );
}

/** グループ順に並んだカテゴリを、グループの境目に隙間を入れて描く。 */
export function TileRow({ categories }: { categories: Category[] }) {
  return (
    <>
      {categories.map((c, i) => {
        const prev = categories[i - 1];
        return <Tile key={c.id} category={c} groupStart={!!prev && prev.group !== c.group} />;
      })}
    </>
  );
}
