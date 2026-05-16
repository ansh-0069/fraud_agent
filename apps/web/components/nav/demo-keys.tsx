"use client";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

// Demo path: rehearsed flow the user steps through during the pitch.
// Right-arrow advances, Left-arrow retreats, Esc returns to landing.
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
  "/impact",
  "/audit",
];

export function DemoKeys() {
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // ignore when typing in inputs / textareas
      const t = e.target as HTMLElement | null;
      if (t && /input|textarea|select/i.test(t.tagName)) return;
      if (e.key === "Escape") {
        router.push("/");
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
  }, [pathname, router]);
  return null;
}
