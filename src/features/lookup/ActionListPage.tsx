import { Link, useParams } from "react-router";
import { findings } from "../../content";
import { Page } from "../../ui/Page";
import { ACTION_META, CATEGORY_LABEL, CATEGORY_ORDER, isAction } from "./actions";

export function ActionListPage() {
  const { action } = useParams();
  if (!isAction(action)) {
    return (
      <Page title="Hittades inte">
        <Link to="/" className="inline-flex min-h-11 items-center text-sky-800 underline">
          Till uppslag
        </Link>
      </Page>
    );
  }
  const meta = ACTION_META[action];
  const list = findings.filter((f) => f.action === action);

  return (
    <Page title={meta.label}>
      <p className={`mb-4 flex items-center gap-2 rounded-lg border-2 p-3 font-medium ${meta.classes}`}>
        {meta.icon}
        {meta.hint}
      </p>
      {CATEGORY_ORDER.map((category) => {
        const group = list.filter((f) => f.category === category);
        if (group.length === 0) return null;
        return (
          <section key={category} className="mb-5" aria-labelledby={`kat-${category}`}>
            <h2
              id={`kat-${category}`}
              className="mb-2 text-sm font-semibold tracking-wide text-slate-600 uppercase"
            >
              {CATEGORY_LABEL[category]}
            </h2>
            <ul className="space-y-2">
              {group.map((f) => (
                <li key={f.id}>
                  <Link
                    to={`/fynd/${f.id}`}
                    className="block rounded-lg border border-slate-300 bg-white p-3"
                  >
                    <span className="block font-semibold">{f.name}</span>
                    <span className="block text-sm text-slate-700">{f.summary}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
      <Link to="/" className="inline-flex min-h-11 items-center text-sky-800 underline">
        Till uppslag
      </Link>
    </Page>
  );
}
