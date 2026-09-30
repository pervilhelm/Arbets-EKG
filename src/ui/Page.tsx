import { useEffect, type ReactNode } from "react";

export function Page({ title, children }: { title: string; children?: ReactNode }) {
  useEffect(() => {
    document.title = `${title} · EKG-träning`;
  }, [title]);

  return (
    <section>
      <h1 className="mb-4 text-2xl font-bold">{title}</h1>
      {children}
    </section>
  );
}
