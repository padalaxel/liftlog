"use client";

import type { CoachStructuredPayload, ExerciseAdjustmentItem } from "@/lib/validation";
import { cn } from "@/lib/utils";

type Props = {
  structured?: CoachStructuredPayload | null;
  summary_note?: string | null | undefined;
  detailed_feedback?: string | null | undefined;
  next_session_focus?: string | null | undefined;
  recovery_observation?: string | null | undefined;
  variant?: "compact" | "full" | "debrief";
};

/** Section kicker + optional title — creates clear hierarchy without boxing everything */
function SectionHeader({
  kicker,
  title,
  className,
}: {
  kicker: string;
  title?: string;
  className?: string;
}) {
  return (
    <header className={cn("mb-2.5", className)}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-600">{kicker}</p>
      {title ? <h3 className="mt-1 text-[15px] font-semibold leading-tight text-zinc-200">{title}</h3> : null}
    </header>
  );
}

function ExerciseAdjustmentBlock({ ex }: { ex: ExerciseAdjustmentItem }) {
  return (
    <div className="relative border-l-2 border-emerald-500/30 pl-3.5">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <h4 className="text-[16px] font-semibold leading-snug tracking-tight text-zinc-50">{ex.exercise_name}</h4>
        <span className="inline-flex max-w-full rounded-full bg-emerald-950/55 px-2 py-0.5 text-[11px] font-medium leading-tight text-emerald-300/95 ring-1 ring-emerald-500/15">
          {ex.decision}
        </span>
      </div>
      <p className="mt-2.5 text-[15px] leading-relaxed text-zinc-400">{ex.why}</p>
      <div className="mt-3.5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-600">Next session target</p>
        <p className="mt-1 font-mono text-[14px] font-medium leading-snug tracking-tight text-zinc-100">
          {ex.next_session_target}
        </p>
      </div>
      <p className="mt-2.5 text-[13px] leading-snug text-zinc-500">
        <span className="text-zinc-600">Cue</span> <span className="text-zinc-400">{ex.focus}</span>
      </p>
    </div>
  );
}

function FocusBullets({ lines }: { lines: string[] }) {
  if (lines.length === 0) return <p className="text-sm text-zinc-500">—</p>;
  return (
    <ul className="space-y-2.5">
      {lines.map((line, i) => (
        <li key={i} className="flex gap-3 text-[15px] leading-snug text-zinc-300">
          <span className="mt-[0.35em] h-1 w-1 shrink-0 rounded-full bg-emerald-400/70" aria-hidden />
          <span>{line.replace(/^[\s•\-\*]+\s*/, "")}</span>
        </li>
      ))}
    </ul>
  );
}

function FocusListFromText({ text }: { text: string }) {
  const lines = text
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return null;
  return (
    <ul className="space-y-2.5">
      {lines.map((line, i) => {
        const stripped = line.replace(/^[\s•\-\*]+\s*/, "");
        return (
          <li key={i} className="flex gap-3 text-[15px] leading-snug text-zinc-300">
            <span className="mt-[0.35em] h-1 w-1 shrink-0 rounded-full bg-emerald-400/70" aria-hidden />
            <span>{stripped}</span>
          </li>
        );
      })}
    </ul>
  );
}

function ExerciseAdjustmentsLegacy({ text }: { text: string }) {
  const trimmed = text.trim();
  if (!trimmed) return <p className="text-sm text-zinc-500">No exercise notes yet.</p>;

  const blocks = trimmed.split(/\n{2,}/).filter(Boolean);
  return (
    <div className="space-y-6">
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
            <div key={i} className="relative border-l-2 border-zinc-700/60 pl-3.5">
              <p className="text-[16px] font-semibold text-zinc-100">{title}</p>
              <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed text-zinc-400">{rest}</p>
            </div>
          );
        }
        return (
          <p key={i} className="whitespace-pre-wrap text-[15px] leading-relaxed text-zinc-400">
            {block}
          </p>
        );
      })}
    </div>
  );
}

export function CoachNotesPanel({
  structured,
  summary_note,
  detailed_feedback,
  next_session_focus,
  recovery_observation,
  variant = "full",
}: Props) {
  const compact = variant === "compact";
  const debrief = variant === "debrief";
  const sectionGap = debrief ? "space-y-8" : compact ? "space-y-4" : "space-y-6";
  const maxRead = debrief ? "mx-auto max-w-lg" : "";

  if (structured) {
    return (
      <section className={`${maxRead} ${debrief ? "" : compact ? "p-2.5" : "p-1"} ${sectionGap}`}>
        {!compact && !debrief ? (
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-600">Coach debrief</p>
        ) : null}

        {/* Hero summary — typography-led, no box */}
        <div>
          <SectionHeader kicker="Session summary" />
          <p
            className={`leading-relaxed text-zinc-200 ${
              debrief ? "text-[16px]" : compact ? "text-sm" : "text-[15px]"
            }`}
          >
            {structured.session_summary.trim() || "—"}
          </p>
        </div>

        {/* Lifts — accent rails, no per-row cards */}
        <div>
          <SectionHeader kicker="Exercise adjustments" />
          <div className="space-y-7">
            {structured.exercise_adjustments.map((ex, i) => (
              <ExerciseAdjustmentBlock key={`${ex.exercise_name}-${i}`} ex={ex} />
            ))}
          </div>
        </div>

        {/* Focus — one soft surface, not a second “card” */}
        <div className="rounded-xl bg-zinc-900/40 px-3.5 py-3 ring-1 ring-zinc-800/50">
          <SectionHeader kicker="Next session focus" className="mb-3" />
          <FocusBullets lines={structured.next_session_focus} />
        </div>

        {/* Recovery — footer tone, separated by rule */}
        <div className="border-t border-zinc-800/80 pt-6">
          <SectionHeader kicker="Recovery" />
          <p className="text-[15px] leading-relaxed text-zinc-500">{structured.recovery.trim() || "—"}</p>
        </div>
      </section>
    );
  }

  return (
    <section
      className={`rounded-2xl border border-zinc-800/60 bg-zinc-950/25 ${compact ? "p-3" : "p-4"} ${sectionGap}`}
    >
      <div>
        <SectionHeader kicker="Session summary" />
        <p className="text-[15px] leading-relaxed text-zinc-200">{summary_note?.trim() || "—"}</p>
      </div>

      <div>
        <SectionHeader kicker="Exercise adjustments" />
        <ExerciseAdjustmentsLegacy text={detailed_feedback ?? ""} />
      </div>

      <div className="rounded-xl bg-zinc-900/35 px-3.5 py-3 ring-1 ring-zinc-800/45">
        <SectionHeader kicker="Next session focus" className="mb-3" />
        {next_session_focus?.trim() ? (
          <FocusListFromText text={next_session_focus} />
        ) : (
          <p className="text-sm text-zinc-500">—</p>
        )}
      </div>

      <div className="border-t border-zinc-800/70 pt-5">
        <SectionHeader kicker="Recovery" />
        <p className="text-[15px] leading-relaxed text-zinc-500">{recovery_observation?.trim() || "—"}</p>
      </div>
    </section>
  );
}
