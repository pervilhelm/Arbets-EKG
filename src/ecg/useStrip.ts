import { useEffect, useState } from "react";
import { loadStrip, type LoadedStrip } from "./strips";

/** Loads strips by id. null while loading; "error" if any of them failed. */
export function useStrips(ids: readonly string[]): LoadedStrip[] | "error" | null {
  const key = ids.join(",");
  const [state, setState] = useState<{ key: string; value: LoadedStrip[] | "error" }>();
  useEffect(() => {
    let live = true;
    Promise.all(key.split(",").filter(Boolean).map(loadStrip)).then(
      (value) => live && setState({ key, value }),
      () => live && setState({ key, value: "error" }),
    );
    return () => {
      live = false;
    };
  }, [key]);
  return state?.key === key ? state.value : null;
}

export function useStrip(id: string): LoadedStrip | "error" | null {
  const value = useStrips([id]);
  return Array.isArray(value) ? value[0] : value;
}
