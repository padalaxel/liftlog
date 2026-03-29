"use client";

import { useEffect } from "react";
import { NumericKeypad } from "@/components/workout/numeric-entry/NumericKeypad";
import { useNumericEntry } from "@/hooks/useNumericEntry";

/** Approximate max sheet height (matches panel max-h) + small gap above keypad. */
function estimateKeypadOverlapPx(): number {
  return Math.min(380, typeof window !== "undefined" ? window.innerHeight * 0.78 : 380) + 12;
}

export function NumericEntrySheet() {
  const { open, active, fieldType, kind, digit, decimal, backspace, next, close, adjust } =
    useNumericEntry();
  const ft = fieldType ?? kind;
  const fieldKind: "weight" | "reps" = ft === "weight" ? "weight" : "reps";

  useEffect(() => {
    if (!open || !active) return;
    const frame = requestAnimationFrame(() => {
      const sel = `[data-numeric-target="${active.exerciseId}:${active.setId}:${active.kind}"]`;
      const el = document.querySelector(sel);
      if (!el || !(el instanceof HTMLElement)) return;

      const viewportH = window.visualViewport?.height ?? window.innerHeight;
      const keypadTop = viewportH - estimateKeypadOverlapPx();
      const margin = 16;
      const safeBottom = keypadTop - margin;
      const rect = el.getBoundingClientRect();

      if (rect.bottom <= safeBottom && rect.top >= 8) {
        return;
      }

      const delta = rect.bottom - safeBottom;
      if (delta > 2) {
        window.scrollBy({ top: delta, behavior: "smooth" });
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [open, active?.exerciseId, active?.setId, active?.kind]);

  if (!open) return null;

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
          paddingBottom: "max(8px, env(safe-area-inset-bottom, 0px))",
        }}
      >
        <div className="mx-auto w-12 pt-1.5 pb-0.5">
          <div className="h-1 rounded-full bg-neutral-700" />
        </div>
        <NumericKeypad
          fieldKind={fieldKind}
          onDigit={digit}
          onDecimal={decimal}
          onBackspace={backspace}
          onNext={next}
          onAdjust={adjust}
          onClose={close}
        />
      </div>
    </div>
  );
}
