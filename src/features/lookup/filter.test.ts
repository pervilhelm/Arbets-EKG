import { describe, expect, it } from "vitest";
import { findings } from "../../content";
import { filterFindings } from "./filter";

describe("filterFindings", () => {
  it("finns via alias, oavsett versaler", () => {
    expect(filterFindings(findings, "vt").map((f) => f.id)).toContain("vt-ihallande");
    expect(filterFindings(findings, "PSVT").map((f) => f.id)).toContain("svt");
  });
  it("ignorerar diakritiska tecken", () => {
    expect(filterFindings(findings, "skankel").map((f) => f.id)).toContain("skankelblock-nytt");
    expect(filterFindings(findings, "skänkel").map((f) => f.id)).toContain("skankelblock-nytt");
  });
  it("ger inga träffar för tom sökning", () => {
    expect(filterFindings(findings, "  ")).toEqual([]);
  });
});
