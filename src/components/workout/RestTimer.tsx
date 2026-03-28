"use client";

import { useEffect, useState } from "react";

import { formatSeconds } from "@/lib/utils";

type Props = {
  seconds: number;
  label?: string;
  onReset: () => void;
};

export function RestTimer({ seconds, label, onReset }: Props) {
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    setRemaining(seconds);
  }, [seconds]);

  useEffect(() => {
    if (remaining <= 0) return;
    const id = window.setInterval(
      () => setRemaining((value) => Math.max(0, value - 1)),
      1000,
    );
    return () => window.clearInterval(id);
  }, [remaining]);

  useEffect(() => {
    if (remaining > 0) return;
    // Short double-beep when rest completes. If audio is blocked, fail silently.
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as typeof window & { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const scheduleBeep = (when: number) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.value = 880;
          gain.gain.value = 0.0001;
          osc.connect(gain);
          gain.connect(ctx.destination);
          gain.gain.exponentialRampToValueAtTime(0.18, when + 0.01);
          gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.15);
          osc.start(when);
          osc.stop(when + 0.16);
        };
        const start = ctx.currentTime;
        scheduleBeep(start);
        scheduleBeep(start + 0.2);
      }
    } catch {
      // ignore audio errors
    }
    onReset();
  }, [remaining, onReset]);

  return (
    <div className="fixed bottom-24 left-1/2 z-40 -translate-x-1/2 rounded-lg border border-zinc-600 bg-zinc-900 px-4 py-2 shadow-xl">
      <p className="text-[11px] text-zinc-400">{label ?? "Rest timer"}</p>
      <button className="text-xl font-semibold tabular-nums text-zinc-100" onClick={onReset}>
        {formatSeconds(remaining)}
      </button>
    </div>
  );
}
