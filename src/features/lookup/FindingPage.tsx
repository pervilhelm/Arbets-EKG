import { Link, useParams } from "react-router";
import { findingById, sources } from "../../content";
import { Page } from "../../ui/Page";
import { ACTION_META } from "./actions";
import { FindingEcg } from "./FindingEcg";

export function FindingPage() {
  const { id } = useParams();
  const finding = id ? findingById.get(id) : undefined;
  if (!finding) {
    return (
      <Page title="Fyndet hittades inte">
        <Link to="/" className="text-sky-800 underline">
          Till uppslag
        </Link>
      </Page>
    );
  }
  const meta = ACTION_META[finding.action];

  return (
    <Page title={finding.name}>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Link
          to={`/uppslag/${finding.action}`}
          className={`inline-flex min-h-11 items-center gap-2 rounded-lg border-2 px-3 font-bold ${meta.classes}`}
        >
          {meta.icon}
          {meta.label}
        </Link>
        {finding.review.status === "utkast" && (
          <span className="rounded-lg border border-yellow-500 bg-yellow-100 px-3 py-2 text-sm font-semibold text-yellow-950">
            Ej granskad
          </span>
        )}
      </div>

      <FindingEcg finding={finding} />

      <p className="mt-4 text-lg">{finding.summary}</p>

      <h2 className="mt-5 mb-1 text-lg font-bold">Känns igen på</h2>
      <ul className="list-disc space-y-1 pl-5">
        {finding.recognize.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>

      {finding.confuseWith.length > 0 && (
        <>
          <h2 className="mt-5 mb-1 text-lg font-bold">Förväxla inte med</h2>
          <ul className="space-y-2">
            {finding.confuseWith.map((c) => (
              <li key={c.findingId}>
                <Link to={`/fynd/${c.findingId}`} className="font-semibold text-sky-800 underline">
                  {findingById.get(c.findingId)?.name ?? c.findingId}
                </Link>
                <span className="block text-sm text-slate-700">{c.difference}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      <h2 className="mt-5 mb-1 text-lg font-bold">Gör så här</h2>
      <p>{finding.todo}</p>

      <h2 className="mt-5 mb-1 text-lg font-bold">Källa</h2>
      <ul className="text-sm text-slate-700">
        {finding.sources.map((s) => (
          <li key={`${s.sourceId}-${s.locator}`}>
            {sources.find((x) => x.id === s.sourceId)?.title ?? s.sourceId}: {s.locator}
          </li>
        ))}
      </ul>
    </Page>
  );
}
