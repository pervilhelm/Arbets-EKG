import { useState } from "react";
import { Link } from "react-router";
import { findingById, findings } from "../content";
import type { Action } from "../content/schema";
import { useStrips } from "../ecg/useStrip";
import { ACTION_META } from "../features/lookup/actions";
import { Page } from "../ui/Page";
import { PracticeEcg } from "./PracticeEcg";
import { generateQuiz, recordAnswer, type Question } from "./quiz";
import { loadMissed, saveMissed } from "./storage";

const PROMPT: Record<Question["type"], string> = {
  "ekg-fynd": "Vilket fynd visar EKG:t?",
  "ekg-atgard": "Vilken åtgärd kräver fyndet i EKG:t?",
  "namn-atgard": "Vilken åtgärd gäller för fyndet?",
};

const optionLabel = (q: Question, option: string) =>
  q.type === "ekg-fynd" ? (findingById.get(option)?.name ?? option) : ACTION_META[option as Action].label;

/** Shows one of the finding's 12-lead strips, picked once per question. */
function QuestionEcg({ findingId }: { findingId: string }) {
  const strips = useStrips(findingById.get(findingId)?.ecg?.stripIds ?? []);
  const [pick] = useState(() => Math.random());
  const twelve = Array.isArray(strips) ? strips.filter((s) => s.twelveLead) : null;
  const data =
    strips === "error" || twelve?.length === 0 ? "error" : twelve && twelve[Math.floor(pick * twelve.length)];
  return <PracticeEcg data={data} label="EKG med 12 avledningar för frågan" />;
}

function Results({
  quiz,
  answers,
  onRestart,
}: {
  quiz: Question[];
  answers: string[];
  onRestart: () => void;
}) {
  const right = quiz.filter((q, i) => answers[i] === q.answer).length;
  return (
    <>
      <p className="mb-4 text-xl font-bold">
        Du fick {right} av {quiz.length} rätt.
      </p>
      <ul className="mb-6 space-y-2">
        {quiz.map((q, i) => {
          const ok = answers[i] === q.answer;
          const finding = findingById.get(q.findingId)!;
          return (
            <li
              key={q.key}
              className="flex items-start gap-2 rounded-lg border border-slate-200 bg-white p-3"
            >
              <span className={`font-bold ${ok ? "text-green-800" : "text-red-800"}`}>
                {ok ? "Rätt" : "Fel"}
              </span>
              <span>
                {PROMPT[q.type]}{" "}
                <Link to={`/fynd/${finding.id}`} className="font-semibold text-sky-800 underline">
                  {finding.name}
                </Link>
                {q.type !== "ekg-fynd" && <>: {ACTION_META[finding.action].label}</>}
              </span>
            </li>
          );
        })}
      </ul>
      <button
        type="button"
        onClick={onRestart}
        className="min-h-11 w-full rounded-lg bg-sky-800 px-4 font-semibold text-white"
      >
        Nytt pass
      </button>
    </>
  );
}

export function QuizPage() {
  // Each pass is weighted by the questions missed so far.
  const newPass = () => generateQuiz(findings, { missed: loadMissed() });
  const [quiz, setQuiz] = useState(newPass);
  const [answers, setAnswers] = useState<string[]>([]);
  const [index, setIndex] = useState(0);

  const restart = () => {
    setQuiz(newPass());
    setAnswers([]);
    setIndex(0);
  };

  if (index >= quiz.length) {
    return (
      <Page title="Quiz">
        <Results quiz={quiz} answers={answers} onRestart={restart} />
      </Page>
    );
  }

  const q = quiz[index];
  const answered = answers[index];
  const finding = findingById.get(q.findingId)!;

  const answer = (option: string) => {
    if (answered !== undefined) return;
    setAnswers((a) => [...a, option]);
    saveMissed(recordAnswer(loadMissed(), q.key, option === q.answer));
  };

  return (
    <Page title="Quiz">
      <p className="mb-3 text-sm font-semibold text-slate-700">
        Fråga {index + 1} av {quiz.length}
      </p>
      {q.type !== "namn-atgard" && <QuestionEcg key={q.key} findingId={q.findingId} />}
      <h2 className="mt-4 mb-3 text-xl font-bold">
        {q.type === "namn-atgard" ? `${PROMPT[q.type]} ${finding.name}` : PROMPT[q.type]}
      </h2>

      <div className="grid gap-2" role="group" aria-label="Svarsalternativ">
        {q.options.map((option) => {
          const state =
            answered === undefined
              ? "border-slate-400 bg-white"
              : option === q.answer
                ? "border-green-700 bg-green-50 text-green-950"
                : option === answered
                  ? "border-red-700 bg-red-50 text-red-950"
                  : "border-slate-300 bg-white opacity-60";
          return (
            <button
              key={option}
              type="button"
              disabled={answered !== undefined}
              aria-pressed={option === answered}
              onClick={() => answer(option)}
              className={`min-h-12 rounded-lg border-2 px-4 py-2 text-left font-semibold ${state}`}
            >
              {optionLabel(q, option)}
            </button>
          );
        })}
      </div>

      {answered !== undefined && (
        <div role="status" className="mt-4 rounded-lg border border-slate-300 bg-white p-4">
          <p className={`text-lg font-bold ${answered === q.answer ? "text-green-800" : "text-red-800"}`}>
            {answered === q.answer ? "Rätt!" : `Fel. Rätt svar: ${optionLabel(q, q.answer)}.`}
          </p>
          <p className="mt-1">
            {finding.name}: {ACTION_META[finding.action].label.toLowerCase()}.{" "}
            <Link to={`/fynd/${finding.id}`} className="font-semibold text-sky-800 underline">
              Läs fyndkortet
            </Link>
          </p>
          <button
            type="button"
            onClick={() => setIndex((i) => i + 1)}
            className="mt-3 min-h-11 w-full rounded-lg bg-sky-800 px-4 font-semibold text-white"
          >
            {index + 1 < quiz.length ? "Nästa fråga" : "Visa resultat"}
          </button>
        </div>
      )}
    </Page>
  );
}
