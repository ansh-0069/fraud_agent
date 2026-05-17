"use client";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { PERSONAS } from "@/lib/personas";

// Linear path the operator walks during the live pitch. ←/→ advance.
const DEMO_PATH = [
  "/",
  "/personas",
  "/dashboard",
  "/fdt-lab",
  "/mace",
  "/coach",
  "/guardian",
  "/reasoning-log",
  "/architecture",
  "/segments",
  "/population",
  "/impact",
  "/audit",
];

/**
 * Global keyboard shortcuts. All ignored when the focus is on an editable
 * field (input, textarea, contenteditable) so the operator can still type
 * normally into the MACE chat box.
 *
 *   ← / →      — step backward / forward through the rehearsed demo path
 *   Esc        — if a persona filter is active, clear it; otherwise return
 *                to the landing page
 *   1 / 2 / 3 / 4 — switch the persona filter to that persona
 *   0          — clear the persona filter (back to "All Drivers")
 */
export function DemoKeys() {
  const router = useRouter();
  const pathname = usePathname();
  const setPersonaFilter = useAppStore((s) => s.setPersonaFilter);
  const clearFilter = useAppStore((s) => s.clearFilter);
  const isAll = useAppStore((s) => s.isAllDrivers());
  const demoRunning = useAppStore((s) => s.demoRunning);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Don't hijack typing in editable fields
      const t = e.target as HTMLElement | null;
      if (t && /input|textarea|select/i.test(t.tagName)) return;
      if (t && (t.isContentEditable || t.getAttribute("role") === "textbox"))
        return;

      // Don't hijack modifier-key combos (Ctrl+1 in browser, etc.)
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      // While auto-demo is running, lock out persona / nav keys so the
      // script can't fight the operator and vice versa.
      if (demoRunning) return;

      // Persona shortcuts: 1..4 → PERSONAS[0..3], 0 → all
      if (e.key === "0") {
        clearFilter();
        return;
      }
      const digit = parseInt(e.key, 10);
      if (digit >= 1 && digit <= PERSONAS.length) {
        setPersonaFilter(PERSONAS[digit - 1].id);
        return;
      }

      if (e.key === "Escape") {
        // First Esc clears the filter, second Esc goes home — so the
        // operator can always reset the state with two taps.
        if (!isAll) {
          clearFilter();
        } else {
          router.push("/");
        }
        return;
      }

      const i = DEMO_PATH.indexOf(pathname);
      if (i < 0) return;
      if (e.key === "ArrowRight" && i < DEMO_PATH.length - 1) {
        router.push(DEMO_PATH[i + 1]);
      } else if (e.key === "ArrowLeft" && i > 0) {
        router.push(DEMO_PATH[i - 1]);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pathname, router, setPersonaFilter, clearFilter, isAll, demoRunning]);
  return null;
}
