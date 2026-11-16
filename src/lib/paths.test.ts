import { describe, expect, it } from "vite-plus/test";
import { isEditingPath } from "./paths";

describe("入力の途中になりうる画面", () => {
  it.each(["/meal/2026-11-11/lunch", "/meal/2026-11-11/other/abc", "/stool/new", "/stool/abc", "/categories/new"])(
    "%s は該当する",
    (path) => {
      expect(isEditingPath(path)).toBe(true);
    },
  );

  it.each(["/", "/day/2026-11-11", "/categories", "/categories/", "/stats"])("%s は該当しない", (path) => {
    expect(isEditingPath(path)).toBe(false);
  });
});
