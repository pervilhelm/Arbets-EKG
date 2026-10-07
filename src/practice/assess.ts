import type { Action } from "../content/schema";

export type Choice = "fortsatt" | "markera" | "avbryt";
/** A timeout means nobody acted, so the test simply continues. */
export type Response = Choice | "timeout";
export type Outcome = "ratt" | "missat-avbrott" | "missat-fynd" | "for-tidigt-avbrott";

export const RESPONSE_WINDOW_SEC = 20;

/** The choices that are right for a step, given the action of its finding (undefined: no finding). */
export function correctChoices(action: Action | undefined): Choice[] {
  if (action === "avbryt") return ["avbryt"];
  if (action === "overvag") return ["markera", "avbryt"];
  return ["fortsatt", "markera"];
}

export function assessStep(action: Action | undefined, response: Response): Outcome {
  const choice: Choice = response === "timeout" ? "fortsatt" : response;
  if (correctChoices(action).includes(choice)) return "ratt";
  if (action === "avbryt") return "missat-avbrott";
  if (action === "overvag") return "missat-fynd";
  return "for-tidigt-avbrott";
}

/** The case ends when the user stops the test, or when an abort is missed and goes straight to review. */
export function endsCase(action: Action | undefined, response: Response): boolean {
  return response === "avbryt" || assessStep(action, response) === "missat-avbrott";
}
