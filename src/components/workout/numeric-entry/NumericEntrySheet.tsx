"use client";

import { EntryDisplay } from "@/components/workout/numeric-entry/EntryDisplay";
import { NumericKeypad } from "@/components/workout/numeric-entry/NumericKeypad";
import { useNumericEntry } from "@/hooks/useNumericEntry";

export function NumericEntrySheet() {
  const { open, buffer, kind, digit, backspace, next, close, adjust } = useNumericEntry();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end" aria-modal role="dialog">
      <button
        type="button"
        className="absolute inset-0 bg-black/40 transition-opacity duration-200 ease-out"
        aria-label="Close"
        onClick={close}
      />
      <div
        className="relative z-10 max-h-[min(420px,85vh)] w-full max-w-[430px] mx-auto rounded-t-2xl border border-neutral-800 border-b-0 bg-neutral-900 shadow-2xl"
        style={{
          animation: "liftlogSheet 0.18s ease-out forwards",
          paddingBottom: "max(12px, env(safe-area-inset-bottom, 0px))",
        }}
      >
        <div className="mx-auto w-12 pt-2">
          <div className="h-1 rounded-full bg-neutral-700" />
        </div>
        <EntryDisplay buffer={buffer} kind={kind === "weight" ? "weight" : "reps"} />
        <NumericKeypad
          onDigit={digit}
          onBackspace={backspace}
          onNext={next}
          onDismiss={close}
          onAdjust={adjust}
        />
      </div>
    </div>
  );
}
