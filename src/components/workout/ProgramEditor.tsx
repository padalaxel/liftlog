"use client";

import { useState } from "react";

type Exercise = {
  id: string;
  exercise_name: string;
  order_index: number;
  target_sets: number;
  rep_min: number;
  rep_max: number;
  target_weight: number;
  increment_lbs: number;
  rest_seconds: number;
  progression_rule: string;
};

type Props = {
  dayId: string;
  dayName: string;
  initialExercises: Exercise[];
};

export function ProgramEditor({ dayId, dayName, initialExercises }: Props) {
  const [exercises, setExercises] = useState(
    initialExercises.slice().sort((a, b) => a.order_index - b.order_index),
  );
  function moveExercise(from: number, to: number) {
    setExercises((prev) => {
      const next = prev.slice();
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next.map((item, idx) => ({ ...item, order_index: idx + 1 }));
    });
  }

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function save() {
    if (dayId === "demo-day") {
      setMessage("Demo mode: sign in to save real program changes.");
      return;
    }
    setSaving(true);
    setMessage(null);
    const res = await fetch(`/api/program-days/${dayId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ exercises }),
    });
    const data = await res.json();
    setSaving(false);
    setMessage(res.ok ? "Saved" : data.error ?? "Save failed");
  }

  return (
    <section className="space-y-2 pb-6">
      <h2 className="text-lg font-semibold">{dayName}</h2>
      {message ? <p className="text-xs text-zinc-400">{message}</p> : null}
      {exercises.map((ex, idx) => (
        <div key={ex.id} className="rounded border border-zinc-800 bg-zinc-900 p-3 text-sm">
          <input className="mb-2 h-10 w-full rounded bg-zinc-950 px-2 text-base" value={ex.exercise_name} onChange={(e) => setExercises((prev) => prev.map((v, i) => i === idx ? { ...v, exercise_name: e.target.value } : v))} />
          <div className="mb-2 grid grid-cols-3 gap-2">
            <input className="h-10 rounded bg-zinc-950 px-2 text-base" type="number" value={ex.target_sets} onChange={(e) => setExercises((prev) => prev.map((v, i) => i === idx ? { ...v, target_sets: Number(e.target.value) } : v))} />
            <input className="h-10 rounded bg-zinc-950 px-2 text-base" type="number" value={ex.rep_min} onChange={(e) => setExercises((prev) => prev.map((v, i) => i === idx ? { ...v, rep_min: Number(e.target.value) } : v))} />
            <input className="h-10 rounded bg-zinc-950 px-2 text-base" type="number" value={ex.rep_max} onChange={(e) => setExercises((prev) => prev.map((v, i) => i === idx ? { ...v, rep_max: Number(e.target.value) } : v))} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <input className="h-10 rounded bg-zinc-950 px-2 text-base" type="number" value={ex.target_weight} onChange={(e) => setExercises((prev) => prev.map((v, i) => i === idx ? { ...v, target_weight: Number(e.target.value) } : v))} />
            <input className="h-10 rounded bg-zinc-950 px-2 text-base" type="number" value={ex.increment_lbs} onChange={(e) => setExercises((prev) => prev.map((v, i) => i === idx ? { ...v, increment_lbs: Number(e.target.value) } : v))} />
            <input className="h-10 rounded bg-zinc-950 px-2 text-base" type="number" value={ex.rest_seconds} onChange={(e) => setExercises((prev) => prev.map((v, i) => i === idx ? { ...v, rest_seconds: Number(e.target.value) } : v))} />
          </div>
          <div className="mt-2 flex gap-2">
            <button className="h-8 rounded bg-zinc-800 px-2 text-xs" disabled={idx === 0} onClick={() => moveExercise(idx, idx - 1)}>Up</button>
            <button className="h-8 rounded bg-zinc-800 px-2 text-xs" disabled={idx === exercises.length - 1} onClick={() => moveExercise(idx, idx + 1)}>Down</button>
          </div>
        </div>
      ))}
      <button className="h-10 w-full rounded bg-zinc-100 text-sm font-semibold text-zinc-900" onClick={save} disabled={saving}>
        {saving ? "Saving..." : "Save Day"}
      </button>
    </section>
  );
}
