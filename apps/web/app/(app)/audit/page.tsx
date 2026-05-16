"use client";
import { PageShell } from "@/components/ui/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";
import { ShieldCheck, CheckCircle2, FileLock2, RefreshCcw } from "lucide-react";
import { shortHash } from "@/lib/utils";

interface AuditRow {
  session_id: string;
  timestamp: string;
  agent: string;
  event: string;
  fdt_snapshot_hash: string;
  rl_action_id: string;
  llm_prompt_hash: string;
  response_hash: string;
  status: "COMMITTED";
  feat: { F: boolean; E: boolean; A: boolean; T: boolean };
}

const PRINCIPLES = [
  { k: "F", label: "Fairness" },
  { k: "E", label: "Ethics" },
  { k: "A", label: "Accountability" },
  { k: "T", label: "Transparency" },
] as const;

function makeRows(personaId: string): AuditRow[] {
  const now = Date.now();
  const seed = personaId.charCodeAt(0);
  const sessions = ["A8821", "B1042", "C0931", "D7710", "E2218", "F9015"];
  const events = [
    { agent: "ORCHESTRATOR", event: "intent.classified" },
    { agent: "FDT", event: "snapshot.loaded" },
    { agent: "RFC", event: "action.selected" },
    { agent: "COACH", event: "response.committed" },
    { agent: "GUARDIAN", event: "anomaly.scored" },
    { agent: "AUDIT", event: "feat.checked" },
  ];
  return sessions.flatMap((s, i) =>
    events.map((e, j) => {
      const t = new Date(now - (i * 6 + j) * 60_000 - seed * 1000);
      return {
        session_id: s,
        timestamp: t.toISOString(),
        agent: e.agent,
        event: e.event,
        fdt_snapshot_hash: `sha256:${shortHash(s + j + "fdt", 12)}…b714`,
        rl_action_id:
          e.agent === "RFC" ? ["INCOME_TARGET_SURGE_WINDOW", "LOAN_RATE_REVIEW", "SAVINGS_BOOST_NOW", "WELLNESS_REST_RECOMMEND"][j % 4] : "—",
        llm_prompt_hash:
          e.agent === "COACH" ? `sha256:${shortHash(s + j + "p", 12)}…aa48` : "—",
        response_hash:
          e.agent === "COACH" ? `sha256:${shortHash(s + j + "r", 12)}…1a07` : "—",
        status: "COMMITTED" as const,
        feat: { F: true, E: true, A: true, T: true },
      };
    })
  );
}

export default function AuditPage() {
  const personaId = useAppStore((s) => s.personaId);
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  useEffect(() => {
    setRows(makeRows(personaId));
  }, [personaId]);

  const verify = (id: string) => {
    setVerifyingId(id);
    setTimeout(() => setVerifyingId(null), 900);
  };

  return (
    <PageShell
      step="STEP 11 · COMPLIANCE & AUDIT"
      title="Every decision · hashed · explainable"
      description={
        <>
          NexusWallet writes a structured audit record on every MACE state
          transition. Hashes commit the FDT snapshot, the chosen RL action, and
          the LLM prompt/response — so every recommendation can be traced and
          reproduced. This is the substrate for{" "}
          <span className="text-foreground">MAS FEAT</span> (Fairness, Ethics,
          Accountability, Transparency) compliance.
        </>
      }
      rightSlot={
        <Button variant="glass" size="sm" onClick={() => setRows(makeRows(personaId))}>
          <RefreshCcw className="h-3.5 w-3.5" />
          Refresh
        </Button>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="surface p-5">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">
            MAS FEAT principles
          </div>
          <div className="mt-3 space-y-2">
            {PRINCIPLES.map((p) => (
              <div
                key={p.k}
                className="flex items-center gap-2 text-xs"
              >
                <div className="h-7 w-7 rounded-md bg-grab-500/15 border border-grab-500/30 text-grab-300 grid place-items-center font-semibold">
                  {p.k}
                </div>
                <div className="flex-1">{p.label}</div>
                <CheckCircle2 className="h-3.5 w-3.5 text-grab-300" />
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-lg border border-white/[0.05] bg-white/[0.02] p-3 text-[11px] text-muted-foreground">
            <div className="font-medium text-foreground/80 flex items-center gap-1.5">
              <FileLock2 className="h-3.5 w-3.5" /> Storage
            </div>
            <div className="mt-1">
              SQLite <code>audit_log</code> (mock) · PostgreSQL in production.
              Append-only, hash-chained, exportable to MAS regulator templates.
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 surface overflow-hidden">
          <div className="px-5 py-3.5 border-b border-white/[0.06] flex items-center justify-between">
            <div className="text-sm font-medium">audit_log · {rows.length} rows</div>
            <Badge variant="default" className="num-mono">
              <ShieldCheck className="h-3 w-3" /> append-only · hash-chained
            </Badge>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-[10px] uppercase tracking-wider text-muted-foreground/80">
                <tr>
                  <th className="text-left px-4 py-2">session</th>
                  <th className="text-left px-2 py-2">agent · event</th>
                  <th className="text-left px-2 py-2">fdt_hash</th>
                  <th className="text-left px-2 py-2">action_id</th>
                  <th className="text-left px-2 py-2">prompt_hash</th>
                  <th className="text-left px-2 py-2">response_hash</th>
                  <th className="text-left px-2 py-2">FEAT</th>
                  <th className="text-left px-2 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const rowId = `${r.session_id}-${i}`;
                  const verifying = verifyingId === rowId;
                  return (
                    <tr
                      key={rowId}
                      className="border-t border-white/[0.04] hover:bg-white/[0.02]"
                    >
                      <td className="px-4 py-2 num-mono text-foreground/85">
                        #{r.session_id}
                      </td>
                      <td className="px-2 py-2">
                        <div className="num-mono text-foreground/80">{r.agent}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {r.event}
                        </div>
                      </td>
                      <td className="px-2 py-2 num-mono text-muted-foreground">
                        {r.fdt_snapshot_hash}
                      </td>
                      <td className="px-2 py-2 num-mono text-grab-300 whitespace-nowrap">
                        {r.rl_action_id}
                      </td>
                      <td className="px-2 py-2 num-mono text-muted-foreground">
                        {r.llm_prompt_hash}
                      </td>
                      <td className="px-2 py-2 num-mono text-muted-foreground">
                        {r.response_hash}
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex gap-0.5">
                          {PRINCIPLES.map((p) => (
                            <span
                              key={p.k}
                              className={`text-[10px] font-medium px-1 rounded ${
                                r.feat[p.k as keyof typeof r.feat]
                                  ? "bg-grab-500/15 text-grab-300"
                                  : "bg-rose-500/15 text-rose-300"
                              }`}
                            >
                              {p.k}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-2 py-2">
                        <button
                          onClick={() => verify(rowId)}
                          className="text-[10px] px-2 py-1 rounded-md bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08]"
                        >
                          {verifying ? "verifying…" : "verify"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
