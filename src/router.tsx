import { createBrowserRouter } from "react-router";
import { AboutPage } from "./features/about/AboutPage";
import { ChecklistsPage } from "./features/checklists/ChecklistsPage";
import { LookupHomePage } from "./features/lookup/LookupHomePage";
import { ReviewPage } from "./review/ReviewPage";
import { SimulatorListPage } from "./simulator/SimulatorListPage";
import { AppShell } from "./ui/AppShell";

export const router = createBrowserRouter(
  [
    {
      element: <AppShell />,
      children: [
        { index: true, element: <LookupHomePage /> },
        { path: "simulator", element: <SimulatorListPage /> },
        { path: "repetera", element: <ReviewPage /> },
        { path: "checklistor", element: <ChecklistsPage /> },
        { path: "om", element: <AboutPage /> },
      ],
    },
  ],
  { basename: import.meta.env.BASE_URL },
);
