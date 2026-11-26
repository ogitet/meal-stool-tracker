import type { Meta, StoryObj } from "@storybook/react-vite";
import { addDays } from "date-fns";
// oxlint-disable-next-line no-restricted-imports -- src の外（.storybook）は @/ で書けない
import type { RouteParameter } from "../../.storybook/preview";
import { toKey } from "@/lib/date";
import { Calendar } from "./Calendar";
import { ItemEdit } from "./ItemEdit";
import { ItemList } from "./ItemList";
import { Login } from "./Login";
import { StoolForm } from "./StoolForm";

/**
 * 画面。デモ用の例データ（src/demo。記録は今日から過去56日分、便は13日分）で表示する。
 * 操作した結果はページを読み直すまで保たれる。ストーリーの外へ遷移すると、行き先の URL を表示する。
 */
const meta = {
  title: "画面",
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const day = (offset: number) => toKey(addDays(new Date(), offset));
const route = (path: string, url: string): { route: RouteParameter } => ({ route: { path, url } });

export const CalendarMonth: Story = {
  name: "S-02 カレンダー（今月）",
  render: () => <Calendar />,
  parameters: route("/", "/"),
};

export const CalendarLastMonth: Story = {
  name: "S-02 カレンダー（先月。食べた日が多い）",
  render: () => <Calendar />,
  parameters: route("/", `/?d=${day(-31)}`),
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

export const Items: Story = {
  name: "S-11 項目管理",
  render: () => <ItemList />,
  parameters: route("/items", "/items"),
};

export const ItemEditBread: Story = {
  name: "S-12 項目編集",
  render: () => <ItemEdit />,
  parameters: route("/items/:id", "/items/bread"),
};

export const ItemNew: Story = {
  name: "S-12 減らしたいものを追加",
  render: () => <ItemEdit />,
  parameters: route("/items/:id", "/items/new?kind=reduce"),
};

export const LoginScreen: Story = {
  name: "S-01 ログイン",
  render: () => <Login />,
};
