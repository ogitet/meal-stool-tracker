import type { Meta, StoryObj } from "@storybook/react-vite";
import { sortCategories } from "@/lib/categories";
import { DEFAULT_CATEGORIES } from "@/lib/constants";
import type { Category } from "@/lib/types";
import { Tile, TileRow } from "./Tile";

const ALL: Category[] = sortCategories(DEFAULT_CATEGORIES.map((c) => ({ ...c, active: true })));
const byId = (id: string) => ALL.find((c) => c.id === id)!;

const meta = {
  title: "部品/カテゴリの印",
  component: Tile,
  parameters: { layout: "centered" },
  args: { category: byId("other_fried") },
} satisfies Meta<typeof Tile>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Single: Story = {};

/** 初期の26種。グループの境目に隙間が入り、折り返しても字下げにならない。 */
export const AllCategories: Story = {
  render: () => (
    <div
      style={{
        width: 300,
        background: "#fff",
        padding: 12,
        borderRadius: 14,
        display: "flex",
        flexWrap: "wrap",
        gap: 3,
      }}
    >
      <TileRow categories={ALL} />
    </div>
  ),
};

/** 週カレンダーの1日分くらいの量。 */
export const OneDay: Story = {
  render: () => (
    <div
      style={{
        width: 240,
        background: "#fff",
        padding: 12,
        borderRadius: 14,
        display: "flex",
        flexWrap: "wrap",
        gap: 3,
      }}
    >
      <TileRow
        categories={[
          "staple_rice",
          "protein_pork",
          "protein_egg",
          "vegetable_veg",
          "other_fried",
          "other_alcohol",
          "sweets_choco",
        ].map(byId)}
      />
    </div>
  ),
};
