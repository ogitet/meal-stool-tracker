import { readFileSync } from "node:fs";
import { describe, expect, it } from "vite-plus/test";

// Node の版は2か所に書く（.node-version は CI の setup-vp、volta は手元の Volta が読む）。
// 片方だけ直して手元と CI の版がずれることを防ぐ。
describe("Node の版", () => {
  it(".node-version と package.json の volta.node が一致している", () => {
    const nodeVersion = readFileSync(".node-version", "utf8").trim();
    const pkg = JSON.parse(readFileSync("package.json", "utf8")) as { volta?: { node?: string } };
    expect(pkg.volta?.node).toBe(nodeVersion);
  });
});
