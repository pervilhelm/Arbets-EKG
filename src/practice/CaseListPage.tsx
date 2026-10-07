import { Link } from "react-router";
import { cases } from "../content";
import { Page } from "../ui/Page";

export function CaseListPage() {
  return (
    <Page title="Fallövningar">
      <p className="mb-4 text-slate-700">
        Du följer ett arbetsprov på cykel. I varje steg har du 20 sekunder att välja <i>Fortsätt</i>,{" "}
        <i>Markera fynd</i> eller <i>Avbryt testet</i>. Efter fallet går du igenom varje steg.
      </p>
      <ul className="space-y-3">
        {cases.map((c) => (
          <li key={c.id}>
            <Link
              to={`/ova/fall/${c.id}`}
              className="block rounded-lg border border-slate-300 bg-white p-4 hover:border-sky-800"
            >
              <h2 className="text-lg font-bold text-sky-800">{c.title}</h2>
              <p className="mt-1 text-slate-700">{c.background}</p>
            </Link>
          </li>
        ))}
      </ul>
    </Page>
  );
}
