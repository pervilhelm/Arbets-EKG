import { Link } from "react-router";
import { Page } from "../ui/Page";

const CARDS = [
  {
    to: "/ova/quiz",
    title: "Quiz",
    text: "Tio frågor om fynd och åtgärder, med riktiga 12-avlednings-EKG. Frågor du svarat fel på kommer oftare.",
  },
  {
    to: "/ova/fall",
    title: "Fallövningar",
    text: "Följ ett arbetsprov steg för steg och bestäm inom 20 sekunder om testet ska fortsätta eller avbrytas.",
  },
];

export function PracticeHomePage() {
  return (
    <Page title="Öva">
      <ul className="space-y-3">
        {CARDS.map((c) => (
          <li key={c.to}>
            <Link
              to={c.to}
              className="block rounded-lg border border-slate-300 bg-white p-4 hover:border-sky-800"
            >
              <h2 className="text-lg font-bold text-sky-800">{c.title}</h2>
              <p className="mt-1 text-slate-700">{c.text}</p>
            </Link>
          </li>
        ))}
      </ul>
    </Page>
  );
}
