import { describe, expect, it } from "vitest";
import { findingById, findings } from "../content";
import {
  findingDistractors,
  generateQuiz,
  isEcgFinding,
  MISSED_WEIGHT,
  QUIZ_LENGTH,
  recordAnswer,
} from "./quiz";
import { seededRng } from "./random";

const SEEDS = Array.from({ length: 200 }, (_, i) => i + 1);

describe("generateQuiz", () => {
  it("gives ten questions, at most one per finding, with unique options containing the answer", () => {
    for (const seed of SEEDS) {
      const quiz = generateQuiz(findings, { rng: seededRng(seed) });
      expect(quiz).toHaveLength(QUIZ_LENGTH);
      expect(new Set(quiz.map((q) => q.findingId)).size).toBe(QUIZ_LENGTH);
      for (const q of quiz) {
        expect(new Set(q.options).size).toBe(q.options.length);
        expect(q.options.filter((o) => o === q.answer)).toHaveLength(1);
        const finding = findingById.get(q.findingId)!;
        if (q.type === "ekg-fynd") {
          expect(q.options).toHaveLength(4);
          expect(q.answer).toBe(finding.id);
          expect(q.options.every((o) => findingById.has(o))).toBe(true);
        } else {
          expect(q.options).toEqual(["fortsatt", "overvag", "avbryt"]);
          expect(q.answer).toBe(finding.action);
        }
        if (q.type !== "namn-atgard") expect(isEcgFinding(finding)).toBe(true);
      }
    }
  });

  it("asks about every finding by name, including blood pressure and symptom findings", () => {
    const keys = new Set(
      SEEDS.flatMap((seed) => generateQuiz(findings, { rng: seededRng(seed) }).map((q) => q.key)),
    );
    for (const f of findings) expect(keys).toContain(`namn-atgard:${f.id}`);
  });

  it("brings missed questions back more often", () => {
    const key = "namn-atgard:dalig-perfusion";
    const share = (missed: string[]) =>
      SEEDS.filter((seed) =>
        generateQuiz(findings, { missed, rng: seededRng(seed) }).some((q) => q.key === key),
      ).length / SEEDS.length;
    expect(MISSED_WEIGHT).toBeGreaterThan(1);
    expect(share([key])).toBeGreaterThan(share([]) * 1.5);
  });
});

describe("findingDistractors", () => {
  it("never includes the right answer, never repeats and puts confuseWith first", () => {
    for (const f of findings.filter(isEcgFinding)) {
      for (const seed of SEEDS.slice(0, 20)) {
        const d = findingDistractors(f, findings, seededRng(seed));
        expect(d).toHaveLength(3);
        expect(d).not.toContain(f.id);
        expect(new Set(d).size).toBe(3);
        const confused = f.confuseWith.map((c) => c.findingId).slice(0, 3);
        expect(d.slice(0, confused.length)).toEqual(confused);
      }
    }
  });

  it("fills up with the same category before other ECG findings", () => {
    const f = findingById.get("st-hojning")!; // ischemi: confuses with st-sankning and skankelblock-nytt
    const d = findingDistractors({ ...f, confuseWith: [] }, findings, seededRng(1));
    expect(d[0]).toBe("st-sankning");
    expect(d.slice(1).every((id) => isEcgFinding(findingById.get(id)!))).toBe(true);
  });
});

describe("recordAnswer", () => {
  it("adds a wrong answer once and removes it when answered right", () => {
    expect(recordAnswer([], "a", false)).toEqual(["a"]);
    expect(recordAnswer(["a"], "a", false)).toEqual(["a"]);
    expect(recordAnswer(["a", "b"], "a", true)).toEqual(["b"]);
  });
});
