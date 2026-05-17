import { Suspense } from "react";
import { Sidebar } from "@/components/nav/sidebar";
import { TopBar } from "@/components/nav/topbar";
import { StoreHydration } from "@/components/store-hydration";
import { PersonaUrlSync } from "@/components/nav/persona-url-sync";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-ink-950 grid-bg">
      <StoreHydration />
      {/* useSearchParams requires a Suspense boundary in Next 14. The
          component itself renders null so the boundary is free. */}
      <Suspense fallback={null}>
        <PersonaUrlSync />
      </Suspense>
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <main className="flex-1 px-4 lg:px-8 py-6 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
