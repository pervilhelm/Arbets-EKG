import { describe, expect, it } from "vitest";
import { assessStep, correctChoices, endsCase } from "./assess";

describe("assessStep", () => {
  it("avbryt: only stopping the test is right", () => {
    expect(assessStep("avbryt", "avbryt")).toBe("ratt");
    expect(assessStep("avbryt", "markera")).toBe("missat-avbrott");
    expect(assessStep("avbryt", "fortsatt")).toBe("missat-avbrott");
  });

  it("overvag: marking or stopping is right, continuing misses the finding", () => {
    expect(assessStep("overvag", "markera")).toBe("ratt");
    expect(assessStep("overvag", "avbryt")).toBe("ratt");
    expect(assessStep("overvag", "fortsatt")).toBe("missat-fynd");
  });

  it("fortsatt or no finding: continuing or marking is right, stopping is too early", () => {
    for (const action of ["fortsatt", undefined] as const) {
      expect(assessStep(action, "fortsatt")).toBe("ratt");
      expect(assessStep(action, "markera")).toBe("ratt");
      expect(assessStep(action, "avbryt")).toBe("for-tidigt-avbrott");
    }
  });

  it("treats a timeout as continuing the test", () => {
    expect(assessStep("avbryt", "timeout")).toBe("missat-avbrott");
    expect(assessStep("overvag", "timeout")).toBe("missat-fynd");
    expect(assessStep("fortsatt", "timeout")).toBe("ratt");
    expect(assessStep(undefined, "timeout")).toBe("ratt");
  });

  it("lists the right choices in display order", () => {
    expect(correctChoices("avbryt")).toEqual(["avbryt"]);
    expect(correctChoices("overvag")).toEqual(["markera", "avbryt"]);
    expect(correctChoices(undefined)).toEqual(["fortsatt", "markera"]);
  });
});

describe("endsCase", () => {
  it("ends on a stop and on a missed abort, otherwise continues", () => {
    expect(endsCase(undefined, "avbryt")).toBe(true);
    expect(endsCase("overvag", "avbryt")).toBe(true);
    expect(endsCase("avbryt", "markera")).toBe(true);
    expect(endsCase("avbryt", "timeout")).toBe(true);
    expect(endsCase("overvag", "markera")).toBe(false);
    expect(endsCase("overvag", "timeout")).toBe(false);
    expect(endsCase("fortsatt", "fortsatt")).toBe(false);
  });
});
