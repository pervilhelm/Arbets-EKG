import { sources } from "../../content";
import { Page } from "../../ui/Page";

export function SourcesPage() {
  return (
    <Page title="Källor och licenser">
      <p className="mb-4 text-sm text-slate-700">
        Fynd, avbrottskriterier och tolkningsguide bygger på riktlinjen nedan. De riktiga EKG-exemplen kommer
        från öppna databaser på PhysioNet och är vilo-EKG, inte arbetsprov. Syntetiska EKG visas bara som
        märkt komplement på fyndkortet.
      </p>
      <ul className="space-y-4">
        {sources.map((s) => (
          <li key={s.id} className="rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="font-semibold">
              <a
                href={s.url}
                className="inline-flex min-h-11 items-center text-sky-800 underline"
                target="_blank"
                rel="noreferrer"
              >
                {s.title}
              </a>
            </h2>
            {s.license && (
              <p className="mt-2 text-sm">
                <span className="font-medium">Licens:</span> {s.license}
              </p>
            )}
            {s.citation && (
              <p className="mt-2 text-sm break-words">
                <span className="font-medium">Citering:</span> {s.citation}
              </p>
            )}
          </li>
        ))}
      </ul>
    </Page>
  );
}
