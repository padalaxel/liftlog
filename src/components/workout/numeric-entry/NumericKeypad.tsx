"use client";

import { X } from "lucide-react";
import { KeypadButton } from "@/components/workout/numeric-entry/KeypadButton";

type Props = {
  fieldKind: "weight" | "reps";
  onDigit: (d: string) => void;
  onDecimal: () => void;
  onBackspace: () => void;
  onNext: () => void;
  onAdjust: (delta: number) => void;
  onClose: () => void;
};

export function NumericKeypad({
  fieldKind,
  onDigit,
  onDecimal,
  onBackspace,
  onNext,
  onAdjust,
  onClose,
}: Props) {
  const row3 = (keys: string[]) => (
    <div className="grid grid-cols-3 gap-3">
      {keys.map((k) => (
        <KeypadButton key={k} onClick={() => onDigit(k)} aria-label={`Digit ${k}`}>
          {k}
        </KeypadButton>
      ))}
    </div>
  );

  const decimalEnabled = fieldKind === "weight";

  return (
    <div className="flex gap-2 px-3 pb-[max(12px,env(safe-area-inset-bottom))] pt-2">
      <div className="min-w-0 flex-1 space-y-3">
        {row3(["1", "2", "3"])}
        {row3(["4", "5", "6"])}
        {row3(["7", "8", "9"])}
        <div className="grid grid-cols-3 gap-3">
          {decimalEnabled ? (
            <KeypadButton onClick={onDecimal} aria-label="Decimal point" className="text-lg font-medium">
              .
            </KeypadButton>
          ) : (
            <div className="min-h-[56px] rounded-xl bg-neutral-950/30" aria-hidden />
          )}
          <KeypadButton onClick={() => onDigit("0")} aria-label="Digit 0">
            0
          </KeypadButton>
          <KeypadButton
            variant="default"
            onClick={onBackspace}
            aria-label="Backspace"
            className="text-neutral-300"
          >
            <span className="text-2xl font-light">⌫</span>
          </KeypadButton>
        </div>
      </div>
      <div className="flex w-[96px] shrink-0 flex-col gap-2">
        <KeypadButton
          variant="ghost"
          className="flex h-14 min-h-[56px] items-center justify-center text-neutral-400 hover:bg-neutral-800/80 hover:text-neutral-100"
          onClick={onClose}
          aria-label="Close keypad"
        >
          <X className="h-6 w-6" strokeWidth={2} aria-hidden />
        </KeypadButton>
        <div className="min-h-[124px] flex-1 shrink-0" aria-hidden />
        <KeypadButton variant="primary" className="min-h-[56px] flex-1 text-base font-semibold" onClick={onNext}>
          Next
        </KeypadButton>
        <div className="grid grid-cols-2 gap-2">
          <KeypadButton className="min-h-[48px] text-sm" onClick={() => onAdjust(-1)} aria-label="Minus one step">
            −
          </KeypadButton>
          <KeypadButton className="min-h-[48px] text-sm" onClick={() => onAdjust(1)} aria-label="Plus one step">
            +
          </KeypadButton>
        </div>
      </div>
    </div>
  );
}
