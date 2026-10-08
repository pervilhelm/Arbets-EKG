import { Link } from "react-router";
import { cases, ecgPresets, findings, guide, protocol } from "../../content";
import { Disclaimer } from "../../ui/Disclaimer";
import { Page } from "../../ui/Page";

const reviews = [findings, ecgPresets, cases, [guide], [protocol]].flat().map((item) => item.review);
const reviewers = [...new Set(reviews.flatMap((r) => (r.reviewer ? [r.reviewer] : [])))];
const allReviewed = reviews.every((r) => r.status === "granskad");

export function AboutPage() {
  return (
    <Page title="Om">
      <Disclaimer />
      <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
        <dt className="font-semibold">Version</dt>
        <dd>{__APP_VERSION__}</dd>
        <dt className="font-semibold">Innehållet uppdaterat</dt>
        <dd>{__CONTENT_DATE__}</dd>
        <dt className="font-semibold">Medicinsk granskning</dt>
        <dd>
          {reviewers.length > 0 ? reviewers.join(", ") : "Inte granskat ännu"}
          {reviewers.length > 0 && !allReviewed && " (delvis)"}
        </dd>
      </dl>
      <p className="mt-4">
        <Link to="/om/kallor" className="inline-flex min-h-11 items-center text-sky-800 underline">
          Källor och licenser
        </Link>
      </p>
    </Page>
  );
}
