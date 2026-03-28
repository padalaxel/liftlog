"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { CoachNotesPanel } from "@/components/workout/CoachNotesPanel";
import { parseCoachStructured } from "@/types/coach";

type WorkoutSet = {
  id: string;
  template_exercise_id: string;
  set_number: number;
  target_weight: number;
  actual_weight: number | null;
  target_reps: number;
  actual_reps: number | null;
  completed: boolean;
};

type TemplateExercise = {
  id: string;
  exercise_name: string;
  order_index: number;
};

export default function WorkoutDetailPage() {
  const params = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [workout, setWorkout] = useState<{
    ai_summary_note: string | null;
    ai_detailed_feedback?: string | null;
    ai_next_session_focus?: string | null;
    ai_recovery_observation?: string | null;
    ai_coach_structured?: unknown;
    program_days?: { name: string } | null;
    workout_sets: WorkoutSet[];
  } | null>(null);
  const [templates, setTemplates] = useState<TemplateExercise[]>([]);
  const [messages, setMessages] = useState<
    Array<{ id: string; role: "user" | "assistant"; message: string; created_at: string }>
  >([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [generatingNotes, setGeneratingNotes] = useState(false);
  const [notesMessage, setNotesMessage] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/history/${params.id}`);
      if (!res.ok) {
        setError("Could not load this workout.");
        setLoading(false);
        return;
      }
      const data = await res.json();
      setWorkout(data.workout);
      setTemplates(data.templates ?? []);
      setMessages(data.conversations ?? []);
      setLoading(false);
    }
    load();
  }, [params.id]);

  const structuredCoach = useMemo(
    () => parseCoachStructured(workout?.ai_coach_structured ?? null),
    [workout?.ai_coach_structured],
  );

  const hasCoachNotes = Boolean(
    structuredCoach || workout?.ai_detailed_feedback?.trim() || workout?.ai_summary_note?.trim(),
  );

  const setsByTemplate = useMemo(() => {
    const map = new Map<string, WorkoutSet[]>();
    for (const set of workout?.workout_sets ?? []) {
      const arr = map.get(set.template_exercise_id) ?? [];
      arr.push(set);
      map.set(set.template_exercise_id, arr);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => a.set_number - b.set_number);
    }
    return map;
  }, [workout]);

  return (
    <main className="mx-auto min-h-screen w-full max-w-md space-y-3 p-3 pb-28">
      <h1 className="mb-3 text-xl font-semibold">
        {workout?.program_days?.name ?? "Workout Detail"}
      </h1>
      {loading ? <p className="text-sm text-zinc-400">Loading...</p> : null}
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      <section className="space-y-3">
        <h2 className="text-base font-semibold text-zinc-100">Coach Notes</h2>
        <CoachNotesPanel
          variant="full"
          structured={structuredCoach}
          summary_note={workout?.ai_summary_note}
          detailed_feedback={workout?.ai_detailed_feedback}
          next_session_focus={workout?.ai_next_session_focus}
          recovery_observation={workout?.ai_recovery_observation}
        />
        {!hasCoachNotes ? (
          <button
            className="h-9 rounded bg-zinc-100 px-3 text-sm font-semibold text-zinc-900 disabled:opacity-50"
            disabled={generatingNotes}
            onClick={async () => {
              setGeneratingNotes(true);
              setNotesMessage(null);
              const res = await fetch("/api/ai/generate-coach-feedback", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ workout_id: params.id }),
              });
              if (res.ok) {
                const data = await res.json();
                setWorkout((prev) =>
                  prev
                    ? {
                        ...prev,
                        ai_summary_note: data.summary_note,
                        ai_detailed_feedback: data.detailed_feedback,
                        ai_next_session_focus:
                          typeof data.next_session_focus_text === "string"
                            ? data.next_session_focus_text
                            : null,
                        ai_recovery_observation: data.recovery_observation,
                        ai_coach_structured: {
                          session_summary: data.session_summary,
                          exercise_adjustments: data.exercise_adjustments,
                          next_session_focus: data.next_session_focus,
                          recovery: data.recovery,
                        },
                      }
                    : prev,
                );
                setNotesMessage("Coach notes generated.");
              } else {
                const errBody = (await res.json().catch(() => ({}))) as {
                  error?: string;
                  message?: string;
                };
                const detail =
                  typeof errBody.error === "string"
                    ? errBody.error
                    : typeof errBody.message === "string"
                      ? errBody.message
                      : `${res.status} ${res.statusText}`;
                setNotesMessage(`Could not generate notes: ${detail}`);
              }
              setGeneratingNotes(false);
            }}
          >
            {generatingNotes ? "Generating..." : "Generate Coach Notes"}
          </button>
        ) : null}
        {notesMessage ? <p className="text-xs text-zinc-400">{notesMessage}</p> : null}
      </section>
      <div className="space-y-2">
        {templates.map((template) => (
          <section key={template.id} className="rounded border border-zinc-800 bg-zinc-900 p-3">
            <h2 className="mb-2 text-sm font-semibold">{template.exercise_name}</h2>
            <div className="space-y-1">
              {(setsByTemplate.get(template.id) ?? []).map((set) => (
                <div key={set.id} className="grid grid-cols-4 gap-2 text-xs">
                  <span className="text-zinc-500">Set {set.set_number}</span>
                  <span className="text-zinc-400">
                    Plan {set.target_weight}x{set.target_reps}
                  </span>
                  <span className="text-zinc-200">
                    Did {set.actual_weight ?? "-"}x{set.actual_reps ?? "-"}
                  </span>
                  <span className={set.completed ? "text-emerald-300" : "text-zinc-500"}>
                    {set.completed ? "Done" : "Open"}
                  </span>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
      <section className="rounded-lg border border-zinc-800 bg-zinc-900 p-3">
        <h2 className="mb-2 text-base font-semibold text-zinc-100">Ask Coach</h2>
        <div className="mb-2 max-h-80 space-y-2 overflow-y-auto rounded-md bg-zinc-950 p-2.5">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`max-w-[92%] rounded-xl px-3 py-2 text-sm leading-6 ${
                msg.role === "user"
                  ? "ml-auto bg-zinc-100 text-zinc-900"
                  : "mr-auto border border-zinc-700 bg-zinc-800 text-zinc-100"
              }`}
            >
              {msg.message}
            </div>
          ))}
          {messages.length === 0 ? (
            <p className="text-xs text-zinc-400">Ask about progression, fatigue, volume, or rest periods.</p>
          ) : null}
        </div>
        <div className="sticky bottom-0 flex gap-2 rounded-md bg-zinc-900 pt-1">
          <input
            className="h-11 flex-1 rounded-md border border-zinc-700 bg-zinc-950 px-3 text-base"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Ask Coach about this workout..."
            onKeyDown={(e) => {
              if (e.key !== "Enter" || e.shiftKey) return;
              e.preventDefault();
              if (chatLoading || chatInput.trim().length === 0) return;
              (e.currentTarget.nextElementSibling as HTMLButtonElement | null)?.click();
            }}
          />
          <button
            className="h-11 rounded-md bg-zinc-100 px-4 text-sm font-semibold text-zinc-900 disabled:opacity-50"
            disabled={chatLoading || chatInput.trim().length === 0}
            onClick={async () => {
              const text = chatInput.trim();
              if (!text) return;
              setChatInput("");
              setChatLoading(true);
              const tempUserId = `u-${Date.now()}`;
              setMessages((prev) => [
                ...prev,
                { id: tempUserId, role: "user", message: text, created_at: new Date().toISOString() },
              ]);
              const res = await fetch("/api/workout-conversations/message", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ workout_id: params.id, message: text }),
              });
              if (res.ok) {
                const data = await res.json();
                setMessages((prev) => [
                  ...prev,
                  {
                    id: `a-${Date.now()}`,
                    role: "assistant",
                    message: data.reply,
                    created_at: new Date().toISOString(),
                  },
                ]);
              } else {
                setMessages((prev) => [
                  ...prev,
                  {
                    id: `a-err-${Date.now()}`,
                    role: "assistant",
                    message: "Could not reach coach right now. Please try again.",
                    created_at: new Date().toISOString(),
                  },
                ]);
              }
              setChatLoading(false);
            }}
          >
            {chatLoading ? "..." : "Send"}
          </button>
        </div>
      </section>
    </main>
  );
}
