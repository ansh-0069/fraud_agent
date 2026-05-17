"use client";
import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { PERSONAS } from "@/lib/personas";

/**
 * Two-way sync between `?persona=…` in the URL and the global persona
 * filter in the Zustand store. Letting the URL be the source of truth on
 * load means demo links are shareable and reproducible:
 *
 *   /dashboard?persona=ahmad   →  filter pre-set to Ahmad
 *   /dashboard                 →  All Drivers (fleet view)
 *
 * Subsequent in-app changes (via the dropdown, keyboard, or auto-demo)
 * are written back to the URL with `router.replace` so refresh keeps the
 * current view.
 *
 * Mount once near the root of the app shell.
 */
export function PersonaUrlSync() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const filter = useAppStore((s) => s.personaFilter);
  const setFilter = useAppStore((s) => s.setPersonaFilter);
  // While the scripted auto-demo is firing, it owns navigation. Writing
  // the URL from this hook in the same tick that the demo calls
  // router.push("/mace") creates a race that pins the operator on
  // /dashboard. So we pause store→URL sync during demo mode and let the
  // demo runner reassert the route itself.
  const demoRunning = useAppStore((s) => s.demoRunning);

  // URL → store (only on first mount / external nav)
  useEffect(() => {
    const fromUrl = params.get("persona") ?? "";
    const isValid =
      fromUrl === "" || PERSONAS.some((p) => p.id === fromUrl);
    if (!isValid) return;
    if (fromUrl !== filter) {
      setFilter(fromUrl);
    }
    // Intentionally only react to pathname changes — query-param changes
    // we make ourselves below shouldn't loop back into this effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Store → URL
  useEffect(() => {
    if (demoRunning) return; // see comment on `demoRunning` above
    const current = params.get("persona") ?? "";
    if (filter === current) return;
    const next = new URLSearchParams(params.toString());
    if (filter) next.set("persona", filter);
    else next.delete("persona");
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, pathname, demoRunning]);

  return null;
}
