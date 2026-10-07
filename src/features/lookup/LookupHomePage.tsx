import { useState } from "react";
import { Link } from "react-router";
import { findings } from "../../content";
import { Disclaimer } from "../../ui/Disclaimer";
import { Page } from "../../ui/Page";
import { ACTIONS, ACTION_META } from "./actions";
import { filterFindings } from "./filter";

export function LookupHomePage() {
  const [query, setQuery] = useState("");
  const matches = filterFindings(findings, query);

  return (
    <Page title="Uppslag">
      <Disclaimer />
      <ul className="mt-4 space-y-3">
        {ACTIONS.map((action) => {
          const meta = ACTION_META[action];
          const count = findings.filter((f) => f.action === action).length;
          return (
            <li key={action}>
              <Link
                to={`/uppslag/${action}`}
                className={`flex min-h-20 items-center gap-3 rounded-xl border-2 p-4 ${meta.classes}`}
              >
                {meta.icon}
                <span className="flex-1">
                  <span className="block text-xl font-bold">{meta.label}</span>
                  <span className="block text-sm">{meta.hint}</span>
                </span>
                <span className="text-sm font-semibold">{count} fynd</span>
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="mt-6">
        <label htmlFor="sok" className="block text-sm font-semibold">
          Sök fynd
        </label>
        <input
          id="sok"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Namn eller förkortning, t.ex. VT"
          autoComplete="off"
          className="mt-1 min-h-12 w-full rounded-lg border border-slate-400 bg-white px-3"
        />
        {query.trim() !== "" && (
          <ul
            className="mt-2 divide-y divide-slate-200 rounded-lg border border-slate-300 bg-white"
            aria-live="polite"
          >
            {matches.length === 0 && <li className="p-3 text-sm text-slate-600">Inga fynd matchar.</li>}
            {matches.map((f) => (
              <li key={f.id}>
                <Link
                  to={`/fynd/${f.id}`}
                  className="flex min-h-12 items-center justify-between gap-2 px-3 py-2"
                >
                  <span className="font-medium">{f.name}</span>
                  <span className="text-xs font-semibold">{ACTION_META[f.action].label}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Page>
  );
}
