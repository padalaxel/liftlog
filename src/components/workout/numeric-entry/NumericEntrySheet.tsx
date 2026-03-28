"use client";

import { NumericKeypad } from "@/components/workout/numeric-entry/NumericKeypad";
import { useNumericEntry } from "@/hooks/useNumericEntry";

export function NumericEntrySheet() {
  const { open, fieldType, kind, digit, backspace, next, close, adjust } = useNumericEntry();

  if (!open) return null;

  const ft = fieldType ?? kind;
  const fieldLabel = ft === "weight" ? "Weight" : ft === "reps" ? "Reps" : "Entry";
  const unitHint = ft === "weight" ? "lb · whole numbers" : "reps";

  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end" aria-modal role="dialog">
      <button
        type="button"
        className="absolute inset-0 bg-black/40 transition-opacity duration-200 ease-out"
        aria-label="Close"
        onClick={close}
      />
      <div
        className="relative z-10 mx-auto w-full max-w-[430px] max-h-[min(380px,78vh)] rounded-t-2xl border border-neutral-800 border-b-0 bg-neutral-900 shadow-2xl"
        style={{
          animation: "liftlogSheet 0.18s ease-out forwards",
          paddingBottom: "max(12px, env(safe-area-inset-bottom, 0px))",
        }}
      >
        <div className="mx-auto w-12 pt-2">
          <div className="h-1 rounded-full bg-neutral-700" />
        </div>
        <div className="flex items-baseline justify-between border-b border-neutral-800/90 px-4 pb-2 pt-1">
          <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-neutral-500">
            {fieldLabel}
          </span>
          <span className="text-[11px] text-neutral-600">{unitHint}</span>
        </div>
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
