"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const DEFAULT_ERROR = "โหลดข้อมูลไม่สำเร็จ กรุณาลองใหม่";

/**
 * Load a page's data once on mount, behind the usual token guard.
 *
 * Every admin page had rebuilt the same block by hand: read the token, bounce to
 * /login when it's missing, flip a loading flag, await the fetch, set an error
 * string, clear loading in a finally. This owns that, so a page only supplies the
 * request itself.
 *
 * `fetcher` is read through a ref, so an inline arrow doesn't retrigger the load.
 * That also means it must not close over values that change between renders —
 * pass `reload` a fresh one via an argument instead.
 *
 * Returns `setData` for the cases where a mutation already knows the new value
 * and a full refetch would be wasteful.
 *
 * `deps` refetches when they change — needed on routes keyed by a param, where
 * navigating between two of them swaps the param without remounting.
 */
export default function usePageData(
  fetcher,
  { errorMessage = DEFAULT_ERROR, initialData = null, deps = [] } = {}
) {
  const router = useRouter();
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetcherRef = useRef(fetcher);
  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  const reload = useCallback(async () => {
    if (!localStorage.getItem("token")) {
      router.push("/login");
      return;
    }
    setLoading(true);
    setError("");
    try {
      setData(await fetcherRef.current());
    } catch (err) {
      console.error("Page data fetch failed:", err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [router, errorMessage]);

  // Serialized so the dep array stays a fixed shape the linter can verify.
  // `deps` are route params and similar primitives, so this is cheap and stable.
  const depsKey = JSON.stringify(deps);

  useEffect(() => {
    // reload flips `loading` before its first await, which is the point of a
    // fetch-on-mount hook — the render that schedules this effect is the one
    // that should already be showing a skeleton.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload();
  }, [reload, depsKey]);

  return { data, loading, error, reload, setData };
}
