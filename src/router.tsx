import { createBrowserRouter } from "react-router";
import { AboutPage } from "./features/about/AboutPage";
import { SourcesPage } from "./features/about/SourcesPage";
import { ActionListPage } from "./features/lookup/ActionListPage";
import { FindingPage } from "./features/lookup/FindingPage";
import { GuidePage } from "./features/guide/GuidePage";
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
        { path: "uppslag/:action", element: <ActionListPage /> },
        { path: "fynd/:id", element: <FindingPage /> },
        { path: "simulator", element: <SimulatorListPage /> },
        { path: "repetera", element: <ReviewPage /> },
        { path: "tolka", element: <GuidePage /> },
        { path: "om", element: <AboutPage /> },
        { path: "om/kallor", element: <SourcesPage /> },
        ...(import.meta.env.DEV
          ? [
              {
                path: "dev/ecg",
                HydrateFallback: () => null,
                lazy: async () => ({ Component: (await import("./ecg/DevEcgPage")).DevEcgPage }),
              },
            ]
          : []),
      ],
    },
  ],
  { basename: import.meta.env.BASE_URL },
);
