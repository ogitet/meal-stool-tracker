import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { AMOUNT_LABEL, AMOUNTS } from "@/lib/constants";
import { Segment } from "./Segment";

const meta = {
  title: "部品/セグメント",
  parameters: { layout: "padded" },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

/** 量（任意）。選択中をもう一度押すと解除できる。 */
export const Optional: Story = {
  render: () => {
    const [v, setV] = useState<string | null>(null);
    return (
      <div style={{ background: "var(--paper)", padding: 12, borderRadius: 14 }}>
        <Segment
          optional
          label="量"
          options={AMOUNTS.map((a) => ({ value: a, label: AMOUNT_LABEL[a] }))}
          value={v}
          onChange={setV}
        />
      </div>
    );
  },
};
