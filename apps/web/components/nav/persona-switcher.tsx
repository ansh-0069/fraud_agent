"use client";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Users, X } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { PERSONAS } from "@/lib/personas";
import { cn } from "@/lib/utils";

/**
 * Global persona filter, mounted in the topbar. Lets the demo operator
 * narrow every aggregate-capable tab to a single persona — or step back
 * to "All Drivers" for the fleet view.
 *
 *   "" (empty filter)  → All Drivers (aggregate)
 *   "ahmad" / "meilin" / "raj" / "kadek" → filtered view
 *
 * Keyboard shortcuts handled separately in <DemoKeys />:
 *   1 / 2 / 3 / 4 → switch to that persona
 *   0            → All Drivers
 *   Esc          → clear filter (when not on a typed-in field)
 */
export function PersonaSwitcher() {
  const filter = useAppStore((s) => s.personaFilter);
  const setFilter = useAppStore((s) => s.setPersonaFilter);
  const clearFilter = useAppStore((s) => s.clearFilter);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, [open]);

  const selected = PERSONAS.find((p) => p.id === filter);
  const isAll = !selected;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "group flex items-center gap-2 h-9 rounded-lg border px-3 text-sm transition-colors",
          "border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06]",
          "focus:outline-none focus:ring-2 focus:ring-grab-500/40",
          open && "bg-white/[0.06] border-white/[0.12]"
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {isAll ? (
          <>
            <Users className="h-4 w-4 text-grab-400" />
            <span className="font-medium">All Drivers</span>
            <span className="text-xs text-muted-foreground hidden md:inline">
              · fleet view
            </span>
          </>
        ) : (
          <>
            <span className="text-base leading-none">{selected.segmentEmoji}</span>
            <span className="font-medium">{selected.name}</span>
            <span className="text-xs text-muted-foreground hidden md:inline">
              · {selected.segmentLabel}
            </span>
          </>
        )}
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 text-muted-foreground transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      {/* Clear filter pill — only visible when a persona is selected */}
      {!isAll && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            clearFilter();
          }}
          className="absolute -right-2 -top-2 h-5 w-5 rounded-full bg-grab-500 text-ink-950 grid place-items-center shadow-lg shadow-grab-500/40 hover:bg-grab-400 transition-colors"
          title="Clear filter (Esc)"
          aria-label="Clear persona filter"
        >
          <X className="h-3 w-3" strokeWidth={3} />
        </button>
      )}

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.12 }}
            role="listbox"
            className="absolute right-0 mt-2 w-72 rounded-xl border border-white/[0.08] bg-ink-950/95 backdrop-blur-xl shadow-2xl shadow-black/40 overflow-hidden z-50"
          >
            <div className="px-3 py-2 text-[10px] uppercase tracking-wider text-muted-foreground border-b border-white/[0.06]">
              Filter view
            </div>

            <button
              type="button"
              onClick={() => {
                clearFilter();
                setOpen(false);
              }}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-white/[0.04]",
                isAll && "bg-grab-500/10"
              )}
              role="option"
              aria-selected={isAll}
            >
              <div className="h-8 w-8 rounded-lg bg-grab-500/15 grid place-items-center">
                <Users className="h-4 w-4 text-grab-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium flex items-center gap-2">
                  All Drivers
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/[0.06] text-muted-foreground">
                    0
                  </span>
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  Aggregate fleet view across all {PERSONAS.length} personas
                </div>
              </div>
              {isAll && (
                <div className="h-2 w-2 rounded-full bg-grab-500 shadow-lg shadow-grab-500/50" />
              )}
            </button>

            <div className="h-px bg-white/[0.04]" />

            {PERSONAS.map((p, idx) => {
              const active = p.id === filter;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setFilter(p.id);
                    setOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-white/[0.04]",
                    active && "bg-grab-500/10"
                  )}
                  role="option"
                  aria-selected={active}
                >
                  <div className="h-8 w-8 rounded-lg bg-white/[0.04] grid place-items-center text-base leading-none">
                    {p.segmentEmoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium flex items-center gap-2">
                      {p.name}
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/[0.06] text-muted-foreground">
                        {idx + 1}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {p.segmentLabel} · {p.city}
                    </div>
                  </div>
                  {active && (
                    <div className="h-2 w-2 rounded-full bg-grab-500 shadow-lg shadow-grab-500/50" />
                  )}
                </button>
              );
            })}

            <div className="px-3 py-2 text-[10px] text-muted-foreground border-t border-white/[0.06] bg-white/[0.02]">
              Press <kbd className="font-mono">1</kbd>–<kbd className="font-mono">4</kbd> to switch · <kbd className="font-mono">0</kbd> for all · <kbd className="font-mono">Esc</kbd> to clear
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
