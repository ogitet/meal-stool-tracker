import type { Meta, StoryObj } from "@storybook/react-vite";
import { addDays } from "date-fns";
// oxlint-disable-next-line no-restricted-imports -- src の外（.storybook）は @/ で書けない
import type { RouteParameter } from "../../.storybook/preview";
import { toKey } from "@/lib/date";
import { Calendar } from "./Calendar";
import { CategoryEdit } from "./CategoryEdit";
import { CategoryList } from "./CategoryList";
import { DayDetail } from "./DayDetail";
import { Login } from "./Login";
import { MealForm } from "./MealForm";
import { StoolForm } from "./StoolForm";

/**
 * 画面。デモ用の例データ（src/demo、今日から過去13日分）で表示する。
 * 操作した結果はページを読み直すまで保たれる。ストーリーの外へ遷移すると、行き先の URL を表示する。
 */
const meta = {
  title: "画面",
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const day = (offset: number) => toKey(addDays(new Date(), offset));
const route = (path: string, url: string): { route: RouteParameter } => ({ route: { path, url } });

export const CalendarWeek: Story = {
  name: "S-02 カレンダー（週）",
  render: () => <Calendar />,
  parameters: route("/", "/?view=week"),
};

export const CalendarPastWeek: Story = {
  name: "S-02 カレンダー（先週。印が多い）",
  render: () => <Calendar />,
  parameters: route("/", `/?view=week&d=${day(-7)}`),
};

export const CalendarMonth: Story = {
  name: "S-02 カレンダー（月）",
  render: () => <Calendar />,
  parameters: route("/", "/?view=month"),
};

export const DayDetailYesterday: Story = {
  name: "S-03 日別詳細（昨日）",
  render: () => <DayDetail />,
  parameters: route("/day/:date", `/day/${day(-1)}`),
};

export const DayDetailEmpty: Story = {
  name: "S-03 日別詳細（記録なし）",
  render: () => <DayDetail />,
  parameters: route("/day/:date", `/day/${day(-5)}`),
};

export const MealNew: Story = {
  name: "S-04 食事記録（新規・昼食）",
  render: () => <MealForm />,
  parameters: route("/meal/:date/:slot", `/meal/${day(0)}/lunch`),
};

export const MealEdit: Story = {
  name: "S-04 食事記録（編集・朝食）",
  render: () => <MealForm />,
  parameters: route("/meal/:date/:slot", `/meal/${day(0)}/breakfast`),
};

export const MealEditWithUnused: Story = {
  name: "S-04 食事記録（「使わない」カテゴリを含む記録）",
  render: () => <MealForm />,
  parameters: route("/meal/:date/:slot", `/meal/${day(-12)}/lunch`),
};

export const StoolNew: Story = {
  name: "S-06 便記録（新規）",
  render: () => <StoolForm />,
  parameters: route("/stool/:id", `/stool/new?date=${day(0)}`),
};

export const StoolEdit: Story = {
  name: "S-06 便記録（編集）",
  render: () => <StoolForm />,
  parameters: route("/stool/:id", "/stool/s1"),
};

export const Categories: Story = {
  name: "S-07 カテゴリ管理",
  render: () => <CategoryList />,
  parameters: route("/categories", "/categories"),
};

export const CategoryEditFried: Story = {
  name: "S-08 カテゴリ編集",
  render: () => <CategoryEdit />,
  parameters: route("/categories/:id", "/categories/other_fried"),
};

export const CategoryNew: Story = {
  name: "S-08 カテゴリを追加",
  render: () => <CategoryEdit />,
  parameters: route("/categories/:id", "/categories/new"),
};

export const LoginScreen: Story = {
  name: "S-01 ログイン",
  render: () => <Login />,
};
