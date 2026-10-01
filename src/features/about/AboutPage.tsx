import { Link } from "react-router";
import { Disclaimer } from "../../ui/Disclaimer";
import { Page } from "../../ui/Page";

export function AboutPage() {
  return (
    <Page title="Om">
      <Disclaimer />
      <p className="mt-4">
        <Link to="/om/kallor" className="inline-flex min-h-11 items-center text-sky-800 underline">
          Källor och licenser
        </Link>
      </p>
    </Page>
  );
}
