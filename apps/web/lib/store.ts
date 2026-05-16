"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { PERSONAS, type Persona } from "./personas";

interface AppState {
  personaId: string;
  setPersonaId: (id: string) => void;
  getPersona: () => Persona;
  // Demo telemetry HUD
  lastLLMLatency: number;
  lastFDTRuntime: number;
  setTelemetry: (k: "llm" | "fdt", v: number) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      personaId: PERSONAS[0].id,
      setPersonaId: (id) => set({ personaId: id }),
      getPersona: () => {
        const id = get().personaId;
        return PERSONAS.find((p) => p.id === id) ?? PERSONAS[0];
      },
      lastLLMLatency: 0,
      lastFDTRuntime: 0,
      setTelemetry: (k, v) =>
        set(k === "llm" ? { lastLLMLatency: v } : { lastFDTRuntime: v }),
    }),
    {
      name: "nexuswallet-app",
      partialize: (s) => ({ personaId: s.personaId }),
    }
  )
);
