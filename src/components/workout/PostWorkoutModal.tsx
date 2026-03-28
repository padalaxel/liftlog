"use client";

import { useState } from "react";

type Props = {
  open: boolean;
  submitting?: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    difficulty: "easy" | "good" | "hard" | "failed";
    pain_level: "none" | "minor" | "moderate";
    substitutions_text?: string;
    notes?: string;
  }) => void;
};

export function PostWorkoutModal({ open, submitting = false, onClose, onSubmit }: Props) {
  const [difficulty, setDifficulty] = useState<"easy" | "good" | "hard" | "failed">("good");
  const [pain, setPain] = useState<"none" | "minor" | "moderate">("none");
  const [subs, setSubs] = useState("");
  const [notes, setNotes] = useState("");
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-end bg-black/70 p-3">
      <div className="w-full rounded-lg border border-zinc-800 bg-zinc-950 p-4">
        <h3 className="mb-3 text-lg font-semibold">Post-workout</h3>
        <div className="mb-2 flex gap-2">
          {(["easy", "good", "hard", "failed"] as const).map((v) => (
            <button key={v} className={`rounded px-2 py-1 text-xs ${difficulty === v ? "bg-zinc-200 text-zinc-900" : "bg-zinc-800 text-zinc-200"}`} onClick={() => setDifficulty(v)}>{v}</button>
          ))}
        </div>
        <div className="mb-2 flex gap-2">
          {(["none", "minor", "moderate"] as const).map((v) => (
            <button key={v} className={`rounded px-2 py-1 text-xs ${pain === v ? "bg-zinc-200 text-zinc-900" : "bg-zinc-800 text-zinc-200"}`} onClick={() => setPain(v)}>{v}</button>
          ))}
        </div>
        <input className="mb-2 h-10 w-full rounded bg-zinc-900 px-2 text-sm" placeholder="Substitutions (optional)" value={subs} onChange={(e) => setSubs(e.target.value)} />
        <textarea className="mb-3 w-full rounded bg-zinc-900 px-2 py-2 text-sm" rows={3} placeholder="General note (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
        <div className="flex gap-2">
          <button disabled={submitting} className="flex-1 rounded bg-zinc-200 px-3 py-2 text-sm font-semibold text-zinc-900 disabled:opacity-50" onClick={() => onSubmit({ difficulty, pain_level: pain, substitutions_text: subs || undefined, notes: notes || undefined })}>{submitting ? "Saving..." : "Update Next Session"}</button>
          <button disabled={submitting} className="rounded bg-zinc-800 px-3 py-2 text-sm disabled:opacity-50" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
