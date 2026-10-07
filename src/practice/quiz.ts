import { ECG_CATEGORIES, type Action, type Finding } from "../content/schema";
import { shuffle, type Rng } from "./random";

export type QuestionType = "ekg-fynd" | "ekg-atgard" | "namn-atgard";

export type Question = {
  /** Stable id of the question, e.g. "ekg-fynd:svt". Used to remember missed questions. */
  key: string;
  type: QuestionType;
  findingId: string;
  /** Finding ids for "ekg-fynd", actions for the others. Always unique and containing the answer. */
  options: string[];
  answer: string;
};

export const QUIZ_LENGTH = 10;
const FINDING_OPTIONS = 4;
/** A missed question is this many times as likely to be drawn as one answered correctly. */
export const MISSED_WEIGHT = 4;
const ACTION_ORDER: readonly Action[] = ["fortsatt", "overvag", "avbryt"];

export const isEcgFinding = (f: Finding) => ECG_CATEGORIES.includes(f.category);

/** Distractors: findings it is confused with first, then the same category, then other ECG findings. */
export function findingDistractors(finding: Finding, findings: readonly Finding[], rng: Rng): string[] {
  const others = findings.filter((f) => f.id !== finding.id);
  const ordered = [
    ...finding.confuseWith.map((c) => c.findingId),
    ...shuffle(
      others.filter((f) => f.category === finding.category).map((f) => f.id),
      rng,
    ),
    ...shuffle(
      others.filter(isEcgFinding).map((f) => f.id),
      rng,
    ),
  ];
  return [...new Set(ordered)].filter((id) => id !== finding.id).slice(0, FINDING_OPTIONS - 1);
}

function buildQuestion(
  type: QuestionType,
  finding: Finding,
  findings: readonly Finding[],
  rng: Rng,
): Question {
  const key = `${type}:${finding.id}`;
  if (type === "ekg-fynd") {
    const options = shuffle([finding.id, ...findingDistractors(finding, findings, rng)], rng);
    return { key, type, findingId: finding.id, options, answer: finding.id };
  }
  // The three actions in a fixed order, from mildest to most severe, so they are easy to scan.
  return { key, type, findingId: finding.id, options: [...ACTION_ORDER], answer: finding.action };
}

/**
 * Draws a pass of questions, at most one per finding so one question cannot give away another.
 * Missed questions are weighted up so they come back more often.
 */
export function generateQuiz(
  findings: readonly Finding[],
  {
    missed = [],
    rng = Math.random,
    count = QUIZ_LENGTH,
  }: { missed?: readonly string[]; rng?: Rng; count?: number } = {},
): Question[] {
  const missedKeys = new Set(missed);
  let candidates = findings.flatMap((f) =>
    (isEcgFinding(f) ? (["ekg-fynd", "ekg-atgard", "namn-atgard"] as const) : (["namn-atgard"] as const)).map(
      (type) => ({ type, finding: f, weight: missedKeys.has(`${type}:${f.id}`) ? MISSED_WEIGHT : 1 }),
    ),
  );

  const questions: Question[] = [];
  while (questions.length < count && candidates.length > 0) {
    const total = candidates.reduce((sum, c) => sum + c.weight, 0);
    let r = rng() * total;
    const picked = candidates.find((c) => (r -= c.weight) < 0) ?? candidates[candidates.length - 1];
    questions.push(buildQuestion(picked.type, picked.finding, findings, rng));
    candidates = candidates.filter((c) => c.finding.id !== picked.finding.id);
  }
  return questions;
}

/** Updates the missed list: a wrong answer adds the question, a right answer removes it. */
export function recordAnswer(missed: readonly string[], key: string, correct: boolean): string[] {
  const rest = missed.filter((k) => k !== key);
  return correct ? rest : [...rest, key];
}
