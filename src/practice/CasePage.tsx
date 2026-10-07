import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router";
import { caseById, findingById } from "../content";
import type { Case, CaseStep } from "../content/schema";
import { EcgStrip } from "../ecg/EcgStrip";
import { useStrip } from "../ecg/useStrip";
import { ACTION_META } from "../features/lookup/actions";
import { Page } from "../ui/Page";
import {
  assessStep,
  correctChoices,
  endsCase,
  RESPONSE_WINDOW_SEC,
  type Choice,
  type Outcome,
  type Response,
} from "./assess";
import { PracticeEcg } from "./PracticeEcg";

type Answer = { response: Response; reactionMs: number };

const CHOICES: { choice: Choice; label: string; classes: string }[] = [
  { choice: "fortsatt", label: "Fortsätt", classes: "border-slate-500 bg-white" },
  { choice: "markera", label: "Markera fynd", classes: "border-amber-600 bg-amber-50 text-amber-950" },
  { choice: "avbryt", label: "Avbryt testet", classes: "border-red-700 bg-red-50 text-red-950" },
];
const CHOICE_LABEL = Object.fromEntries(CHOICES.map((c) => [c.choice, c.label])) as Record<Choice, string>;

const OUTCOME: Record<Outcome, { label: string; classes: string }> = {
  ratt: { label: "Rätt", classes: "bg-green-100 text-green-950 border-green-700" },
  "missat-avbrott": { label: "Missat avbrott", classes: "bg-red-100 text-red-950 border-red-700" },
  "missat-fynd": { label: "Missat fynd", classes: "bg-amber-100 text-amber-950 border-amber-600" },
  "for-tidigt-avbrott": {
    label: "För tidigt avbrott",
    classes: "bg-amber-100 text-amber-950 border-amber-600",
  },
};

const actionOf = (step: CaseStep) => (step.findingId ? findingById.get(step.findingId)?.action : undefined);

const clock = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;

function stepHeading(step: CaseStep) {
  return step.phase === "belastning"
    ? `Belastning ${step.watt} W · ${clock(step.timeSec)}`
    : `Återhämtning · ${clock(step.timeSec)}`;
}

function Vitals({ hr, sbp, dbp }: { hr: number; sbp: number; dbp: number }) {
  return (
    <dl className="my-3 grid grid-cols-2 gap-2">
      <div className="rounded-lg border border-slate-300 bg-white p-3">
        <dt className="text-sm text-slate-600">Puls</dt>
        <dd className="text-2xl font-bold">{hr}/min</dd>
      </div>
      <div className="rounded-lg border border-slate-300 bg-white p-3">
        <dt className="text-sm text-slate-600">Blodtryck</dt>
        <dd className="text-2xl font-bold">
          {sbp}/{dbp}
        </dd>
      </div>
    </dl>
  );
}

function Intro({ c, onStart }: { c: Case; onStart: () => void }) {
  const strip = useStrip(c.baseline.stripId);
  return (
    <>
      {c.review.status === "utkast" && (
        <p className="mb-3 inline-block rounded-lg border border-yellow-500 bg-yellow-100 px-3 py-2 text-sm font-semibold text-yellow-950">
          Ej granskad
        </p>
      )}
      <p className="text-lg">{c.background}</p>
      <h2 className="mt-4 text-lg font-bold">Utgångsläge i vila</h2>
      <Vitals {...c.baseline} />
      <PracticeEcg data={strip} label="Utgångs-EKG med 12 avledningar" />
      <p className="mt-4 text-slate-700">
        EKG:n är riktiga vilo-EKG från öppna databaser. Puls och blodtryck hör till fallet. I varje steg har
        du {RESPONSE_WINDOW_SEC} sekunder att välja.
      </p>
      <button
        type="button"
        onClick={onStart}
        className="mt-4 min-h-12 w-full rounded-lg bg-sky-800 px-4 text-lg font-semibold text-white"
      >
        Starta arbetsprovet
      </button>
    </>
  );
}

function StepView({
  step,
  index,
  total,
  onAnswer,
}: {
  step: CaseStep;
  index: number;
  total: number;
  onAnswer: (a: Answer) => void;
}) {
  const strip = useStrip(step.stripId);
  const ready = strip !== null && strip !== "error";
  const startRef = useRef<number | null>(null);
  const [left, setLeft] = useState(RESPONSE_WINDOW_SEC);
  const answeredRef = useRef(false);

  const onAnswerRef = useRef(onAnswer);
  useEffect(() => {
    onAnswerRef.current = onAnswer;
  });

  const respond = useCallback((response: Response) => {
    if (answeredRef.current || startRef.current === null) return;
    answeredRef.current = true;
    onAnswerRef.current({ response, reactionMs: Math.round(performance.now() - startRef.current) });
  }, []);

  // The response window starts when the ECG is on screen.
  useEffect(() => {
    if (!ready) return;
    startRef.current = performance.now();
    const timer = setInterval(() => {
      const elapsed = (performance.now() - startRef.current!) / 1000;
      const remaining = Math.max(0, Math.ceil(RESPONSE_WINDOW_SEC - elapsed));
      setLeft(remaining);
      if (remaining === 0) respond("timeout");
    }, 200);
    return () => clearInterval(timer);
  }, [ready, respond]);

  return (
    <>
      <p className="text-sm font-semibold text-slate-700">
        Steg {index + 1} av {total}
      </p>
      <h2 className="text-xl font-bold">{stepHeading(step)}</h2>
      <Vitals {...step} />
      {step.symptom && (
        <p className="mb-3 rounded-lg border border-slate-300 bg-white p-3 text-lg">
          Patienten säger: <q>{step.symptom}</q>
        </p>
      )}

      {strip === null && <p className="p-4 text-sm text-slate-600">Laddar EKG …</p>}
      {strip === "error" && <p className="p-4 text-sm text-red-800">EKG:t kunde inte laddas.</p>}
      {ready && (
        <>
          <div className="mb-2 overflow-hidden rounded-lg border border-slate-300">
            <EcgStrip
              mode="sweep"
              samples={strip.leads.II}
              fs={strip.strip.fs}
              heightMm={28}
              label="Monitor, rytmremsa avledning II"
            />
          </div>
          <details open className="mb-2">
            <summary className="min-h-11 cursor-pointer py-2 font-semibold text-sky-800">
              12 avledningar
            </summary>
            <PracticeEcg data={strip} label="EKG med 12 avledningar för steget" />
          </details>

          <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] bg-slate-50 pt-2 pb-1">
            <div
              className="mb-2 h-2 overflow-hidden rounded bg-slate-200"
              role="progressbar"
              aria-label="Tid kvar"
              aria-valuemin={0}
              aria-valuemax={RESPONSE_WINDOW_SEC}
              aria-valuenow={left}
            >
              <div
                className={`h-full ${left <= 5 ? "bg-red-700" : "bg-sky-800"}`}
                style={{ width: `${(left / RESPONSE_WINDOW_SEC) * 100}%` }}
              />
            </div>
            <p className="mb-2 text-sm font-semibold">{left} s kvar</p>
            <div className="grid grid-cols-3 gap-2">
              {CHOICES.map((c) => (
                <button
                  key={c.choice}
                  type="button"
                  onClick={() => respond(c.choice)}
                  className={`min-h-14 rounded-lg border-2 px-2 font-semibold ${c.classes}`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  );
}

function ReviewStep({ step, index, answer }: { step: CaseStep; index: number; answer?: Answer }) {
  const strip = useStrip(step.stripId);
  const action = actionOf(step);
  const finding = step.findingId ? findingById.get(step.findingId) : undefined;
  const outcome = answer && assessStep(action, answer.response);
  return (
    <li className="rounded-lg border border-slate-300 bg-white p-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-bold">
          {index + 1}. {stepHeading(step)}
        </h3>
        {outcome ? (
          <span className={`rounded-lg border px-3 py-1 font-semibold ${OUTCOME[outcome].classes}`}>
            {OUTCOME[outcome].label}
          </span>
        ) : (
          <span className="rounded-lg border border-slate-300 px-3 py-1 text-slate-700">Spelades inte</span>
        )}
      </div>
      <p className="mb-2 text-slate-700">
        Puls {step.hr}/min, BT {step.sbp}/{step.dbp}.
        {step.symptom && (
          <>
            {" "}
            Patienten säger: <q>{step.symptom}</q>
          </>
        )}
      </p>
      <PracticeEcg data={strip} label={`EKG med 12 avledningar för steg ${index + 1}`} />
      <dl className="mt-3 grid gap-1 sm:grid-cols-[auto_1fr] sm:gap-x-4">
        <dt className="font-semibold">Fynd</dt>
        <dd>
          {finding ? (
            <>
              <Link to={`/fynd/${finding.id}`} className="font-semibold text-sky-800 underline">
                {finding.name}
              </Link>{" "}
              ({ACTION_META[finding.action].label.toLowerCase()})
            </>
          ) : (
            "Inget som kräver åtgärd"
          )}
        </dd>
        <dt className="font-semibold">Rätt val</dt>
        <dd>
          {correctChoices(action)
            .map((c) => CHOICE_LABEL[c])
            .join(" eller ")}
        </dd>
        <dt className="font-semibold">Ditt val</dt>
        <dd>
          {!answer
            ? "Testet var redan avslutat"
            : answer.response === "timeout"
              ? `Inget val, tiden gick ut efter ${RESPONSE_WINDOW_SEC} s`
              : `${CHOICE_LABEL[answer.response]} efter ${(answer.reactionMs / 1000).toFixed(1).replace(".", ",")} s`}
        </dd>
      </dl>
    </li>
  );
}

function Review({ c, answers, onRestart }: { c: Case; answers: Answer[]; onRestart: () => void }) {
  const outcomes = answers.map((a, i) => assessStep(actionOf(c.steps[i]), a.response));
  const right = outcomes.filter((o) => o === "ratt").length;
  const ending =
    outcomes[outcomes.length - 1] === "missat-avbrott"
      ? `Testet borde ha avbrutits i steg ${answers.length}.`
      : answers[answers.length - 1].response === "avbryt"
        ? `Du avbröt testet i steg ${answers.length}.`
        : "Du genomförde hela testet.";
  return (
    <>
      <h2 className="text-xl font-bold">Genomgång</h2>
      <p className="mt-1 mb-4 text-lg">
        {right} av {answers.length} steg rätt. {ending}
      </p>
      <ol className="space-y-4">
        {c.steps.map((step, i) => (
          <ReviewStep key={i} step={step} index={i} answer={answers[i]} />
        ))}
      </ol>
      <div className="mt-6 flex gap-3">
        <button
          type="button"
          onClick={onRestart}
          className="min-h-11 flex-1 rounded-lg border border-slate-400 bg-white px-4 font-semibold"
        >
          Spela igen
        </button>
        <Link
          to="/ova/fall"
          className="flex min-h-11 flex-1 items-center justify-center rounded-lg bg-sky-800 px-4 font-semibold text-white"
        >
          Fler fall
        </Link>
      </div>
    </>
  );
}

function CasePlayer({ c }: { c: Case }) {
  const [started, setStarted] = useState(false);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const last = answers[answers.length - 1];
  const done =
    answers.length === c.steps.length ||
    (last !== undefined && endsCase(actionOf(c.steps[answers.length - 1]), last.response));

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [started, answers.length]);

  if (!started) return <Intro c={c} onStart={() => setStarted(true)} />;
  if (done)
    return (
      <Review
        c={c}
        answers={answers}
        onRestart={() => {
          setAnswers([]);
          setStarted(false);
        }}
      />
    );
  const index = answers.length;
  return (
    <StepView
      key={index}
      step={c.steps[index]}
      index={index}
      total={c.steps.length}
      onAnswer={(a) => setAnswers((prev) => [...prev, a])}
    />
  );
}

export function CasePage() {
  const { id } = useParams();
  const c = id ? caseById.get(id) : undefined;
  if (!c)
    return (
      <Page title="Fallet finns inte">
        <Link to="/ova/fall" className="font-semibold text-sky-800 underline">
          Till fallövningarna
        </Link>
      </Page>
    );
  return (
    <Page title={c.title}>
      <CasePlayer key={c.id} c={c} />
    </Page>
  );
}
