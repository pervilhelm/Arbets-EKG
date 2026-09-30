import type { ReactNode } from "react";
import { NavLink } from "react-router";

type NavItem = { to: string; label: string; icon: ReactNode };

// 24x24 stroke icons, drawn with currentColor.
const icon = (path: ReactNode) => (
  <svg
    viewBox="0 0 24 24"
    className="h-6 w-6"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {path}
  </svg>
);

const ITEMS: NavItem[] = [
  {
    to: "/",
    label: "Uppslag",
    icon: icon(
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </>,
    ),
  },
  { to: "/simulator", label: "Simulator", icon: icon(<path d="M2 12h5l2-5 4 12 3-7h6" />) },
  {
    to: "/repetera",
    label: "Repetera",
    icon: icon(
      <>
        <path d="M3 12a9 9 0 0 1 15.5-6.2L21 8" />
        <path d="M21 3v5h-5" />
        <path d="M21 12a9 9 0 0 1-15.5 6.2L3 16" />
        <path d="M3 21v-5h5" />
      </>,
    ),
  },
  {
    to: "/checklistor",
    label: "Checklistor",
    icon: icon(
      <>
        <path d="m3 6 2 2 3-3" />
        <path d="m3 14 2 2 3-3" />
        <path d="M12 7h9" />
        <path d="M12 15h9" />
      </>,
    ),
  },
  {
    to: "/om",
    label: "Om",
    icon: icon(
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v5" />
        <path d="M12 8h.01" />
      </>,
    ),
  },
];

export function BottomNav() {
  return (
    <nav
      aria-label="Huvudmeny"
      className="fixed inset-x-0 bottom-0 z-10 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto grid max-w-3xl grid-cols-5">
        {ITEMS.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 py-2 text-xs font-medium ${
                  isActive ? "text-sky-700" : "text-slate-600 hover:text-slate-900"
                }`
              }
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
