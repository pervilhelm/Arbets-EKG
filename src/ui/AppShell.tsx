import { Outlet } from "react-router";
import { BottomNav } from "./BottomNav";

export function AppShell() {
  return (
    <div className="flex min-h-dvh flex-col">
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-6 pb-[calc(5rem+env(safe-area-inset-bottom))] print:max-w-none print:p-0">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
