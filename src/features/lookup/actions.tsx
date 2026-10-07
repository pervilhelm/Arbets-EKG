import type { ReactNode } from "react";
import type { Action, Category } from "../../content/schema";

export const ACTIONS: readonly Action[] = ["avbryt", "overvag", "fortsatt"];

export function isAction(value: string | undefined): value is Action {
  return ACTIONS.includes(value as Action);
}

const svg = (path: ReactNode) => (
  <svg
    viewBox="0 0 24 24"
    className="h-7 w-7 shrink-0"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {path}
  </svg>
);

/** Colour is never the only carrier of meaning: every action also has an icon and a label. */
export const ACTION_META: Record<Action, { label: string; hint: string; icon: ReactNode; classes: string }> =
  {
    avbryt: {
      label: "Avbryt",
      hint: "Avbryt testet",
      icon: svg(
        <>
          <path d="M8 2h8l6 6v8l-6 6H8l-6-6V8z" />
          <path d="M9 9l6 6M15 9l-6 6" />
        </>,
      ),
      classes: "border-red-700 bg-red-50 text-red-950",
    },
    overvag: {
      label: "Överväg avbrott",
      hint: "Bedöm om testet ska avbrytas",
      icon: svg(
        <>
          <path d="M12 3 2 20h20z" />
          <path d="M12 10v4M12 17h.01" />
        </>,
      ),
      classes: "border-amber-600 bg-amber-50 text-amber-950",
    },
    fortsatt: {
      label: "Fortsätt och observera",
      hint: "Fortsätt testet och följ upp",
      icon: svg(
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="m8 12 3 3 5-6" />
        </>,
      ),
      classes: "border-green-700 bg-green-50 text-green-950",
    },
  };

export const CATEGORY_LABEL: Record<Category, string> = {
  arytmi: "Arytmier",
  overledning: "Överledning",
  ischemi: "Ischemi",
  blodtryck: "Blodtryck",
  symtom: "Symtom",
  ovrigt: "Övrigt",
};

export const CATEGORY_ORDER: readonly Category[] = [
  "arytmi",
  "overledning",
  "ischemi",
  "blodtryck",
  "symtom",
  "ovrigt",
];
