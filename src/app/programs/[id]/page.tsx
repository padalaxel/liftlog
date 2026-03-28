"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ProgramEditor } from "@/components/workout/ProgramEditor";
import { MOCK_PROGRAM_DAYS } from "@/lib/mock-data";

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

export default function ProgramDayEditorPage() {
  const params = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [dayName, setDayName] = useState("Program Day");
  const [exercises, setExercises] = useState<Exercise[]>([]);

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/programs");
      if (!res.ok) {
        const mockDay = MOCK_PROGRAM_DAYS.find((d) => d.id === params.id) ?? MOCK_PROGRAM_DAYS[0];
        setDayName(mockDay.name);
        setExercises(
          mockDay.template_exercises.map((ex) => ({
            id: ex.id,
            exercise_name: ex.exercise_name,
            order_index: ex.order_index,
            target_sets: ex.target_sets,
            rep_min: ex.rep_min,
            rep_max: ex.rep_max,
            target_weight: ex.target_weight,
            increment_lbs: ex.increment_lbs,
            rest_seconds: ex.rest_seconds,
            progression_rule: ex.progression_rule,
          })),
        );
        setLoading(false);
        return;
      }
      const data = await res.json();
      const days = data?.programs?.[0]?.program_days ?? [];
      const day = days.find((d: { id: string }) => d.id === params.id);
      if (day) {
        setDayName(day.name);
        setExercises(day.template_exercises ?? []);
      }
      setLoading(false);
    }
    load();
  }, [params.id]);

  return (
    <main className="mx-auto min-h-screen w-full max-w-md p-3">
      {loading ? (
        <p className="text-sm text-zinc-400">Loading...</p>
      ) : (
        <ProgramEditor dayId={params.id.startsWith("demo-") ? "demo-day" : params.id} dayName={dayName} initialExercises={exercises} />
      )}
    </main>
  );
}
