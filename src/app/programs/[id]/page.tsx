"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/app/AppShell";
import { PageHeader } from "@/components/app/PageHeader";
import { MOCK_PROGRAM_DAYS } from "@/lib/mock-data";

type TemplateEx = {
  id: string;
  exercise_name: string;
  order_index: number;
  target_sets: number;
  rep_min: number;
  rep_max: number;
  cue_text: string | null;
  rest_seconds: number;
};

export default function ProgramDayDetailPage() {
  const params = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [dayName, setDayName] = useState("Workout");
  const [exercises, setExercises] = useState<TemplateEx[]>([]);
  const [demoMode, setDemoMode] = useState(false);

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/programs");
      if (!res.ok) {
        const mockDay = MOCK_PROGRAM_DAYS.find((d) => d.id === params.id) ?? MOCK_PROGRAM_DAYS[0];
        setDayName(mockDay.name);
        setExercises(
          mockDay.template_exercises
            .slice()
            .sort((a, b) => a.order_index - b.order_index)
            .map((ex) => ({
              id: ex.id,
              exercise_name: ex.exercise_name,
              order_index: ex.order_index,
              target_sets: ex.target_sets,
              rep_min: ex.rep_min,
              rep_max: ex.rep_max,
              cue_text: ex.cue_text,
              rest_seconds: ex.rest_seconds,
            })),
        );
        setDemoMode(true);
        setLoading(false);
        return;
      }
      setDemoMode(false);
      const data = await res.json();
      const days = data?.programs?.[0]?.program_days ?? [];
      const day = days.find((d: { id: string }) => d.id === params.id);
      if (day) {
        setDayName(day.name);
        const list = (day.template_exercises ?? []) as TemplateEx[];
        setExercises(list.slice().sort((a, b) => a.order_index - b.order_index));
      }
      setLoading(false);
    }
    void load();
  }, [params.id]);

  function startWorkoutHref() {
    const q = new URLSearchParams();
    q.set("dayId", params.id);
    if (demoMode) q.set("demo", "1");
    return `/today?${q.toString()}`;
  }

  return (
    <AppShell>
      <PageHeader title={dayName} backHref="/programs" />
      <main className="flex flex-1 flex-col gap-4 p-3">
        {loading ? <p className="text-sm text-zinc-400">Loading…</p> : null}

        {!loading ? (
          <>
            <Link
              href={startWorkoutHref()}
              className="flex h-12 items-center justify-center rounded-full bg-zinc-100 text-sm font-semibold text-zinc-900 active:scale-[0.99]"
            >
              Start workout
            </Link>

            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-zinc-400">Exercises</h2>
              <ul className="space-y-2">
                {exercises.map((ex) => (
                  <li
                    key={ex.id}
                    className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-3 text-sm"
                  >
                    <p className="font-medium text-zinc-100">{ex.exercise_name}</p>
                    <p className="mt-1 text-xs text-zinc-400">
                      {ex.target_sets} sets · {ex.rep_min}–{ex.rep_max} reps · rest {ex.rest_seconds}s
                    </p>
                    {ex.cue_text ? (
                      <p className="mt-2 text-xs leading-relaxed text-zinc-500">{ex.cue_text}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>

            <Link
              href={startWorkoutHref()}
              className="flex h-11 items-center justify-center rounded-full border border-zinc-600 text-sm font-medium text-zinc-200"
            >
              Start workout
            </Link>

            <Link
              href={`/programs/${params.id}/edit`}
              className="block py-2 text-center text-xs text-zinc-500 underline"
            >
              Edit template
            </Link>
          </>
        ) : null}
      </main>
    </AppShell>
  );
}
