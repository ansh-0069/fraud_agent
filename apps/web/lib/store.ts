"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { PERSONAS, type Persona } from "./personas";

/**
 * Persona state model
 * ===================
 *
 *   personaFilter === ""        → "All Drivers" (aggregate / fleet view)
 *   personaFilter === "ahmad"   → filtered to a single persona
 *
 * Aggregate-capable pages (/dashboard, /guardian, /audit, /impact) branch
 * on `isAllDrivers()` and render either an aggregate view across all four
 * personas or a filtered view for the selected one.
 *
 * Narrative pages (/coach, /fdt-lab, /mace, /reasoning-log) always need a
 * single persona to render their visualisations, so they read via
 * `getActivePersona()` which falls back to PERSONAS[0] (Ahmad) when the
 * filter is empty. The dropdown still shows "All Drivers" in that case —
 * the narrative pages simply use Ahmad as the canonical demo persona until
 * the operator drills in.
 *
 * Back-compat: `personaId` and `getPersona()` are aliases kept in sync, so
 * the existing 11 consumers (audit, segments, personas, dashboard, etc.)
 * don't have to be touched.
 */
interface AppState {
  // ----- persona state -----
  personaFilter: string;
  personaId: string; // mirrors personaFilter; defaults to PERSONAS[0].id when filter is ""
  setPersonaFilter: (id: string) => void;
  setPersonaId: (id: string) => void; // alias for setPersonaFilter
  clearFilter: () => void;
  isAllDrivers: () => boolean;
  getActivePersona: () => Persona;
  getPersona: () => Persona; // alias for getActivePersona

  // ----- telemetry HUD -----
  lastLLMLatency: number;
  lastFDTRuntime: number;
  setTelemetry: (k: "llm" | "fdt", v: number) => void;

  // ----- demo-mode runner -----
  // demoRunning = the global "auto-pilot" flag (5-query scripted run is firing).
  // demoStepLabel = a short label for the current step, shown in the header.
  // demoQuery = when non-null, the MACE page consumes it, fires it as a user
  //   turn, then clears it via consumeDemoQuery().
  demoRunning: boolean;
  setDemoRunning: (v: boolean) => void;
  demoStepLabel: string;
  setDemoStepLabel: (s: string) => void;
  demoQuery: string | null;
  setDemoQuery: (q: string | null) => void;
  consumeDemoQuery: () => string | null;
}

const fallbackId = PERSONAS[0].id;

const personaForFilter = (filter: string): Persona =>
  PERSONAS.find((p) => p.id === filter) ?? PERSONAS[0];

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Default = "All Drivers" aggregate view, per the production fraud-ops
      // UX: the system shows the fleet by default; operators filter in.
      personaFilter: "",
      personaId: fallbackId,
      setPersonaFilter: (id) =>
        set({ personaFilter: id, personaId: id || fallbackId }),
      setPersonaId: (id) =>
        set({ personaFilter: id, personaId: id || fallbackId }),
      clearFilter: () =>
        set({ personaFilter: "", personaId: fallbackId }),
      isAllDrivers: () => get().personaFilter === "",
      getActivePersona: () => personaForFilter(get().personaFilter),
      getPersona: () => personaForFilter(get().personaFilter),

      lastLLMLatency: 0,
      lastFDTRuntime: 0,
      setTelemetry: (k, v) =>
        set(k === "llm" ? { lastLLMLatency: v } : { lastFDTRuntime: v }),

      demoRunning: false,
      setDemoRunning: (v) => set({ demoRunning: v }),
      demoStepLabel: "",
      setDemoStepLabel: (s) => set({ demoStepLabel: s }),
      demoQuery: null,
      setDemoQuery: (q) => set({ demoQuery: q }),
      consumeDemoQuery: () => {
        const q = get().demoQuery;
        if (q != null) set({ demoQuery: null });
        return q;
      },
    }),
    {
      name: "nexuswallet-app",
      partialize: (s) => ({
        personaFilter: s.personaFilter,
        personaId: s.personaId,
      }),
      // Defer reading localStorage until after first client render so the
      // server-rendered HTML matches the initial client paint (preventing
      // the "Text content does not match server-rendered HTML" hydration
      // error). Hydration is triggered manually by <StoreHydration /> in
      // the app layout.
      skipHydration: true,
    }
  )
);
