"use client";

import { KeypadButton } from "@/components/workout/numeric-entry/KeypadButton";

type Props = {
  onDigit: (d: string) => void;
  onBackspace: () => void;
  onNext: () => void;
  onDismiss: () => void;
  onAdjust: (delta: number) => void;
};

export function NumericKeypad({ onDigit, onBackspace, onNext, onDismiss, onAdjust }: Props) {
  const row3 = (keys: string[]) => (
    <div className="grid grid-cols-3 gap-3">
      {keys.map((k) => (
        <KeypadButton key={k} onClick={() => onDigit(k)} aria-label={`Digit ${k}`}>
          {k}
        </KeypadButton>
      ))}
    </div>
  );

  return (
    <div className="flex gap-2 px-3 pb-[max(12px,env(safe-area-inset-bottom))] pt-2">
      <div className="min-w-0 flex-1 space-y-3">
        {row3(["1", "2", "3"])}
        {row3(["4", "5", "6"])}
        {row3(["7", "8", "9"])}
        <div className="grid grid-cols-3 gap-3">
          <div className="min-h-[56px]" aria-hidden />
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
          className="min-h-[52px] text-xs font-medium"
          onClick={onDismiss}
          aria-label="Close keypad"
        >
          <span className="text-lg" aria-hidden>
            ⌨
          </span>
        </KeypadButton>
        <KeypadButton variant="primary" className="min-h-[56px] flex-1 text-base font-semibold" onClick={onNext}>
          Next
        </KeypadButton>
        <div className="grid grid-cols-2 gap-2">
          <KeypadButton className="min-h-[48px] text-sm" onClick={() => onAdjust(-1)} aria-label="Minus one">
            −
          </KeypadButton>
          <KeypadButton className="min-h-[48px] text-sm" onClick={() => onAdjust(1)} aria-label="Plus one">
            +
          </KeypadButton>
        </div>
        <KeypadButton
          variant="ghost"
          className="min-h-[44px] text-[10px] text-neutral-500"
          disabled
          title="RPE shortcuts coming soon"
        >
          RPE
        </KeypadButton>
      </div>
    </div>
  );
}
