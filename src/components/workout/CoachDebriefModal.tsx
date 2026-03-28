"use client";

import type { CoachStructuredPayload } from "@/lib/validation";
import { CoachNotesPanel } from "@/components/workout/CoachNotesPanel";

type Phase = "loading" | "ready" | "error";

type Props = {
  open: boolean;
  phase: Phase;
  structured: CoachStructuredPayload | null;
  legacySummary?: string | null;
  legacyDetailed?: string | null;
  legacyFocus?: string | null;
  legacyRecovery?: string | null;
  onClose: () => void;
  onRetry?: () => void;
  retryBusy?: boolean;
};

export function CoachDebriefModal({
  open,
  phase,
  structured,
  legacySummary,
  legacyDetailed,
  legacyFocus,
  legacyRecovery,
  onClose,
  onRetry,
  retryBusy,
}: Props) {
  if (!open) return null;

  return (
    <div
      className="coach-debrief-root fixed inset-0 z-[70] flex flex-col bg-gradient-to-b from-zinc-900 via-zinc-950 to-black"
      role="dialog"
      aria-modal="true"
      aria-labelledby="coach-debrief-title"
    >
      <header className="coach-debrief-content shrink-0 border-b border-white/[0.06] bg-zinc-950/75 px-4 pb-3 pt-[max(0.65rem,env(safe-area-inset-top))] backdrop-blur-xl supports-[backdrop-filter]:bg-zinc-950/55">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 pt-0.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-500/80">
              Saved
            </p>
            <h2 id="coach-debrief-title" className="mt-1 text-xl font-semibold tracking-tight text-zinc-50">
              Coach debrief
            </h2>
            <p className="mt-0.5 text-[13px] leading-snug text-zinc-500">
              {phase === "loading"
                ? "Building your notes from this session…"
                : phase === "error"
                  ? "Notes weren’t generated yet"
                  : "What to run with next time"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-full px-3 py-2 text-[15px] font-medium text-zinc-400 transition hover:bg-white/5 hover:text-zinc-100 active:scale-[0.98]"
          >
            Done
          </button>
        </div>
        <div
          className="pointer-events-none mt-3 h-px w-full bg-gradient-to-r from-transparent via-emerald-500/35 to-transparent"
          aria-hidden
        />
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        {phase === "loading" ? (
          <div className="coach-debrief-loading flex min-h-[min(52vh,420px)] flex-col items-center justify-center gap-5 px-2">
            <div className="relative" aria-hidden>
              <div className="h-11 w-11 rounded-full border-2 border-zinc-800" />
              <div className="absolute inset-0 h-11 w-11 animate-spin rounded-full border-2 border-transparent border-t-emerald-400/90" />
            </div>
            <div className="max-w-[280px] text-center">
              <p className="text-[15px] font-medium text-zinc-200">Generating coach notes</p>
              <p className="mt-2 text-[13px] leading-relaxed text-zinc-500">
                Your workout is already saved. Hang tight—this usually takes a few seconds.
              </p>
            </div>
          </div>
        ) : null}

        {phase === "error" ? (
          <div className="coach-debrief-loading mx-auto mt-10 max-w-sm space-y-5 px-1">
            <p className="text-center text-[15px] leading-relaxed text-zinc-400">
              Couldn&apos;t generate coach notes yet. Your workout is still saved—you can retry anytime.
            </p>
            <button
              type="button"
              disabled={retryBusy || !onRetry}
              onClick={() => onRetry?.()}
              className="h-12 w-full rounded-full bg-emerald-500 text-[15px] font-semibold text-zinc-950 shadow-[0_0_24px_-4px_rgba(52,211,153,0.45)] transition hover:bg-emerald-400 active:scale-[0.99] disabled:opacity-50"
            >
              {retryBusy ? "Generating…" : "Try again"}
            </button>
          </div>
        ) : null}

        {phase === "ready" ? (
          <div className="coach-debrief-notes pt-5">
            {structured ? (
              <CoachNotesPanel variant="debrief" structured={structured} />
            ) : (
              <CoachNotesPanel
                variant="debrief"
                summary_note={legacySummary}
                detailed_feedback={legacyDetailed}
                next_session_focus={legacyFocus}
                recovery_observation={legacyRecovery}
              />
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
