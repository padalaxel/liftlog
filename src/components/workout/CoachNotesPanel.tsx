"use client";

import type { ReactNode } from "react";

type Props = {
  summary_note: string | null | undefined;
  detailed_feedback: string | null | undefined;
  next_session_focus: string | null | undefined;
  recovery_observation: string | null | undefined;
  /** compact = tighter spacing for Today banner; full = history detail */
  variant?: "compact" | "full";
};

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">{children}</h3>
  );
}

/** Renders next_session_focus: supports newline-separated lines, optional • or - prefixes */
function FocusList({ text }: { text: string }) {
  const lines = text
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return null;
  return (
    <ul className="list-none space-y-1.5 pl-0">
      {lines.map((line, i) => {
        const stripped = line.replace(/^[\s•\-\*]+\s*/, "");
        return (
          <li key={i} className="flex gap-2 text-sm leading-snug text-zinc-200">
            <span className="mt-0.5 shrink-0 text-emerald-400/90" aria-hidden>
              •
            </span>
            <span>{stripped}</span>
          </li>
        );
      })}
    </ul>
  );
}

/** Splits exercise adjustments into blocks on double newlines or "Name:" style headers */
function ExerciseAdjustments({ text }: { text: string }) {
  const trimmed = text.trim();
  if (!trimmed) return <p className="text-sm text-zinc-400">No exercise notes yet.</p>;

  const blocks = trimmed.split(/\n{2,}/).filter(Boolean);
  return (
    <div className="space-y-3">
      {blocks.map((block, i) => {
        const lines = block.split("\n");
        const first = lines[0]?.trim() ?? "";
        const rest = lines.slice(1).join("\n").trim();
        const looksLikeTitle =
          first.length > 0 &&
          first.length < 80 &&
          (first.endsWith(":") || /^[A-Z]/.test(first)) &&
          rest.length > 0;

        if (looksLikeTitle) {
          const title = first.replace(/:\s*$/, "");
          return (
            <div key={i} className="rounded-md bg-zinc-950/80 px-2.5 py-2">
              <p className="text-sm font-semibold text-zinc-100">{title}</p>
              <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-zinc-300">{rest}</p>
            </div>
          );
        }
        return (
          <p key={i} className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-300">
            {block}
          </p>
        );
      })}
    </div>
  );
}

export function CoachNotesPanel({
  summary_note,
  detailed_feedback,
  next_session_focus,
  recovery_observation,
  variant = "full",
}: Props) {
  const gap = variant === "compact" ? "space-y-2.5" : "space-y-4";
  const pad = variant === "compact" ? "p-2.5" : "p-3";

  return (
    <section className={`rounded-lg border border-zinc-800 bg-zinc-900/90 ${pad} ${gap}`}>
      <div>
        <SectionTitle>Session summary</SectionTitle>
        <p className="text-sm leading-relaxed text-zinc-200">{summary_note?.trim() || "—"}</p>
      </div>

      <div>
        <SectionTitle>Exercise adjustments</SectionTitle>
        <ExerciseAdjustments text={detailed_feedback ?? ""} />
      </div>

      <div>
        <SectionTitle>Next session focus</SectionTitle>
        {next_session_focus?.trim() ? (
          <FocusList text={next_session_focus} />
        ) : (
          <p className="text-sm text-zinc-500">—</p>
        )}
      </div>

      <div>
        <SectionTitle>Recovery</SectionTitle>
        <p className="text-sm leading-relaxed text-zinc-300">{recovery_observation?.trim() || "—"}</p>
      </div>
    </section>
  );
}
