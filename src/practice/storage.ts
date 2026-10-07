// Quiz progress is stored only in this browser. Storage can be unavailable
// (private mode, blocked site data), so every access falls back silently.
const MISSED_KEY = "ekg.quiz.missed";

export function loadMissed(): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(MISSED_KEY) ?? "[]");
    return Array.isArray(value) ? value.filter((k): k is string => typeof k === "string") : [];
  } catch {
    return [];
  }
}

export function saveMissed(keys: readonly string[]): void {
  try {
    localStorage.setItem(MISSED_KEY, JSON.stringify(keys));
  } catch {
    // Progress is a convenience; the quiz works without it.
  }
}
