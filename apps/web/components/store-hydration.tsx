"use client";
import { useEffect } from "react";
import { useAppStore } from "@/lib/store";

/**
 * Triggers Zustand's persist rehydration *after* the first client render,
 * so the server-rendered HTML matches the initial client paint (preventing
 * the "Text content does not match server-rendered HTML" hydration error
 * when the persisted persona differs from the default).
 *
 * Mount once near the root of the app shell.
 */
export function StoreHydration() {
  useEffect(() => {
    useAppStore.persist.rehydrate();
  }, []);
  return null;
}
