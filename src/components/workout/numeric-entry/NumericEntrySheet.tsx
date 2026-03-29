"use client";

import { X } from "lucide-react";
import { NumericKeypad } from "@/components/workout/numeric-entry/NumericKeypad";
import { useNumericEntry } from "@/hooks/useNumericEntry";

export function NumericEntrySheet() {
  const { open, fieldType, kind, digit, backspace, next, close, adjust } = useNumericEntry();

  if (!open) return null;

  const ft = fieldType ?? kind;
  const fieldLabel = ft === "weight" ? "Weight" : ft === "reps" ? "Reps" : "Entry";
  const unitHint = ft === "weight" ? "lb · whole numbers" : "reps";

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[60] flex flex-col justify-end"
      role="dialog"
      aria-label="Numeric entry"
    >
      <div
        className="relative z-10 mx-auto w-full max-w-[430px] max-h-[min(380px,78vh)] pointer-events-auto rounded-t-2xl border border-neutral-800 border-b-0 bg-neutral-900 shadow-2xl"
        style={{
          animation: "liftlogSheet 0.18s ease-out forwards",
          paddingBottom: "max(12px, env(safe-area-inset-bottom, 0px))",
        }}
      >
        <div className="mx-auto w-12 pt-2">
          <div className="h-1 rounded-full bg-neutral-700" />
        </div>
        <div className="flex items-start justify-between gap-3 border-b border-neutral-800/90 px-3 pb-2 pt-1 sm:px-4">
          <div className="min-w-0 pt-0.5">
            <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-neutral-500">
              {fieldLabel}
            </span>
            <p className="mt-0.5 text-[11px] text-neutral-600">{unitHint}</p>
          </div>
          <button
            type="button"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-neutral-400 transition-colors hover:bg-neutral-800/80 hover:text-neutral-100 active:bg-neutral-800"
            aria-label="Close keypad"
            onClick={close}
          >
            <X className="h-5 w-5" strokeWidth={2} aria-hidden />
          </button>
        </div>
        <NumericKeypad onDigit={digit} onBackspace={backspace} onNext={next} onAdjust={adjust} />
      </div>
    </div>
  );
}
