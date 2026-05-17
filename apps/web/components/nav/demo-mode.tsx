"use client";
import { useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Square, Sparkles } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { DEMO_SCRIPT } from "@/lib/demo-script";
import { cn } from "@/lib/utils";

/**
 * Demo Mode: fires a pre-scripted 5-query sequence through the Coach.
 *
 *   step 1 → Ahmad: surge-day approval check        (gig dampening)
 *   step 2 → Ahmad: fraud explanation               (Guardian + SHAP)
 *   step 3 → Mei Lin: financial wellness check      (multi-platform)
 *   step 4 → Raj: shock survival simulation         (FDT Monte Carlo)
 *   step 5 → Kadek: seasonal savings plan           (RL Coach 72-action)
 *
 * The runner navigates to /mace, sets the persona filter, then pushes a
 * scripted query into the store. The MACE page picks the query up via
 * `consumeDemoQuery()` and fires it as a normal user turn — so the agent
 * graph lights up, the reasoning pane scrolls, and SHAP attribution
 * attaches exactly as it would for a typed prompt.
 *
 * Cancellable at any point. Resets persona filter to "All Drivers" when
 * done so the next demo starts from a clean state.
 */
export function DemoMode() {
  const router = useRouter();
  const running = useAppStore((s) => s.demoRunning);
  const setRunning = useAppStore((s) => s.setDemoRunning);
  const setStepLabel = useAppStore((s) => s.setDemoStepLabel);
  const stepLabel = useAppStore((s) => s.demoStepLabel);
  const setFilter = useAppStore((s) => s.setPersonaFilter);
  const clearFilter = useAppStore((s) => s.clearFilter);
  const setDemoQuery = useAppStore((s) => s.setDemoQuery);

  // Cancel token so the async loop can bail mid-sequence when the user
  // hits Stop. Using a ref because we don't want re-renders to reset it.
  const cancelRef = useRef(false);

  const wait = (ms: number) =>
    new Promise<void>((resolve) => {
      const t = setTimeout(resolve, ms);
      // Allow cancellation
      const i = setInterval(() => {
        if (cancelRef.current) {
          clearTimeout(t);
          clearInterval(i);
          resolve();
        }
      }, 50);
    });

  const stop = useCallback(() => {
    cancelRef.current = true;
    setRunning(false);
    setStepLabel("");
    setDemoQuery(null);
  }, [setRunning, setStepLabel, setDemoQuery]);

  const start = useCallback(async () => {
    if (running) return;
    cancelRef.current = false;
    setRunning(true);

    // Make the chat panel visible before we start switching personas, so
    // the first step starts on screen rather than mid-navigation.
    router.push("/mace");
    await wait(450);

    for (let i = 0; i < DEMO_SCRIPT.length; i++) {
      if (cancelRef.current) break;
      const step = DEMO_SCRIPT[i];
      setStepLabel(`${i + 1}/${DEMO_SCRIPT.length} · ${step.label}`);
      setFilter(step.personaId);

      // Tiny delay so the persona swap propagates to <MACEPage /> before
      // we push the demoQuery — otherwise the query may fire against the
      // previous persona's snapshot.
      await wait(280);
      if (cancelRef.current) break;

      setDemoQuery(step.query);

      // Dwell so the agent graph + reasoning pane + streamed reply all
      // have time to play out before we advance.
      await wait(step.dwellMs);
    }

    if (!cancelRef.current) {
      setStepLabel("Demo complete · resetting to All Drivers");
      clearFilter();
      await wait(900);
    }

    setRunning(false);
    setStepLabel("");
    setDemoQuery(null);
  }, [running, router, setRunning, setStepLabel, setFilter, setDemoQuery, clearFilter]);

  // Cleanup if component unmounts mid-run
  useEffect(() => () => {
    cancelRef.current = true;
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={running ? stop : start}
        className={cn(
          "group relative flex items-center gap-2 h-9 rounded-lg px-3 text-sm font-medium transition-all",
          "focus:outline-none focus:ring-2 focus:ring-grab-500/40",
          running
            ? "bg-rose-500/15 border border-rose-500/40 text-rose-200 hover:bg-rose-500/25"
            : "bg-gradient-to-r from-grab-500 to-grab-400 text-ink-950 hover:from-grab-400 hover:to-grab-300 shadow-lg shadow-grab-500/30"
        )}
        title={running ? "Stop the auto-demo" : "Run scripted 5-query auto-demo"}
      >
        {running ? (
          <>
            <Square className="h-3.5 w-3.5 fill-current" />
            <span>STOP DEMO</span>
            <span className="h-1.5 w-1.5 rounded-full bg-rose-400 animate-pulse" />
          </>
        ) : (
          <>
            <Play className="h-3.5 w-3.5 fill-current" />
            <span>AUTO DEMO</span>
            <Sparkles className="h-3 w-3 opacity-70 group-hover:opacity-100 transition-opacity" />
          </>
        )}
      </button>

      {/* Status banner — pulses below the topbar while the script is running */}
      <AnimatePresence>
        {running && stepLabel && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="fixed left-1/2 -translate-x-1/2 top-20 z-50 pointer-events-none"
          >
            <div className="flex items-center gap-3 rounded-full border border-grab-500/40 bg-ink-950/95 backdrop-blur-xl px-4 py-2 shadow-2xl shadow-black/40">
              <span className="relative flex h-2 w-2">
                <span className="absolute inset-0 rounded-full bg-grab-500 animate-ping opacity-75" />
                <span className="relative rounded-full bg-grab-500 h-2 w-2" />
              </span>
              <span className="text-xs font-mono text-grab-300 uppercase tracking-wider">
                AUTO DEMO · {stepLabel}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
