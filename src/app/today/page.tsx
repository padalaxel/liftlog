"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BottomNav } from "@/components/workout/BottomNav";
import { PostWorkoutModal } from "@/components/workout/PostWorkoutModal";
import { WorkoutScreen } from "@/components/workout/WorkoutScreen";
import { MOCK_PROGRAM_DAYS } from "@/lib/mock-data";
import type {
  ActiveRestTimer,
  ActiveRowTarget,
  CompleteSetInput,
  ExerciseCardData,
  FocusTarget,
  UsePreviousInput,
  UpdateSetInput,
} from "@/types/workout-ui";

type ExerciseState = {
  id: string;
  template_exercise_id: string;
  name: string;
  cue_text: string;
  progression_note: string;
  rest_seconds: number;
  rep_min: number;
  rep_max: number;
  bodyweight?: boolean;
  sets: Array<{
    id: string;
    target_weight: number;
    target_reps: number;
    actual_weight?: number;
    actual_reps?: number;
    rest_seconds?: number;
    rir?: number;
    completed: boolean;
  }>;
};

type TemplateSetRow = {
  set_number: number;
  target_weight: number | null;
  target_reps: number;
  rest_seconds: number | null;
  is_bodyweight?: boolean;
  note?: string | null;
  variation?: string | null;
};

type ProgramDayData = {
  id: string;
  name: string;
  order_index: number;
  template_exercises: Array<{
    id: string;
    exercise_name: string;
    order_index: number;
    target_sets: number;
    rep_min: number;
    rep_max: number;
    target_weight: number;
    cue_text: string | null;
    rest_seconds: number;
    template_sets?: TemplateSetRow[] | null;
  }>;
};

function formatPlanLabel(bodyweight: boolean, weight: number, reps: number) {
  if (bodyweight && weight === 0) return `BW x ${reps}`;
  return `${weight} lb x ${reps}`;
}

function buildInitialSetsFromTemplate(ex: ProgramDayData["template_exercises"][number]): ExerciseState["sets"] {
  const rows = ex.template_sets?.slice().sort((a, b) => a.set_number - b.set_number) ?? [];
  if (rows.length > 0 && rows.length === ex.target_sets) {
    return rows.map((row) => {
      const bw = Boolean(row.is_bodyweight);
      const tw = row.target_weight;
      const tr = row.target_reps;
      return {
        id: crypto.randomUUID(),
        target_weight: tw ?? 0,
        target_reps: tr,
        actual_weight: bw ? undefined : tw ?? undefined,
        actual_reps: tr,
        rest_seconds: row.rest_seconds ?? undefined,
        completed: false,
      };
    });
  }
  return Array.from({ length: ex.target_sets }).map(() => ({
    id: crypto.randomUUID(),
    target_weight: Number(ex.target_weight),
    target_reps: ex.rep_max,
    actual_weight: Number(ex.target_weight),
    actual_reps: ex.rep_min,
    completed: false,
  }));
}

function normalizeExercises(input: ExerciseState[]): ExerciseState[] {
  return input.map((exercise) => ({
    ...exercise,
    sets: exercise.sets.map((set) => ({
      ...set,
      id: set.id || crypto.randomUUID(),
      completed: Boolean(set.completed),
    })),
  }));
}

export default function TodayPage() {
  const [elapsed, setElapsed] = useState(0);
  const [showFinish, setShowFinish] = useState(false);
  const [workoutId, setWorkoutId] = useState<string | null>(null);
  const [day, setDay] = useState<ProgramDayData | null>(null);
  const [exercises, setExercises] = useState<ExerciseState[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [finishMessage, setFinishMessage] = useState<string | null>(null);
  const [coachSummary, setCoachSummary] = useState<string | null>(null);
  const [nextSessionFocusBanner, setNextSessionFocusBanner] = useState<string | null>(null);
  const [finishing, setFinishing] = useState(false);
  const [activeRest, setActiveRest] = useState<ActiveRestTimer | null>(null);
  const [activeRow, setActiveRow] = useState<ActiveRowTarget>(null);
  const [focusTarget, setFocusTarget] = useState<FocusTarget>(null);
  const restTimerIdRef = useRef(0);
  const focusRequestRef = useRef(0);

  useEffect(() => {
    const id = window.setInterval(() => setElapsed((v) => v + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    async function loadToday() {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/programs");
      if (!res.ok) {
        const firstDemoDay = MOCK_PROGRAM_DAYS[0];
        setDay({
          id: firstDemoDay.id,
          name: firstDemoDay.name,
          order_index: firstDemoDay.order_index,
          template_exercises: firstDemoDay.template_exercises.map((ex) => ({
            id: ex.id,
            exercise_name: ex.exercise_name,
            order_index: ex.order_index,
            target_sets: ex.target_sets,
            rep_min: ex.rep_min,
            rep_max: ex.rep_max,
            target_weight: ex.target_weight,
            cue_text: ex.cue_text,
            rest_seconds: ex.rest_seconds,
          })),
        });
        setExercises(
          firstDemoDay.template_exercises.map((ex) => {
            const templateRow = ex as ProgramDayData["template_exercises"][number];
            const sets = buildInitialSetsFromTemplate(templateRow);
            return {
              id: ex.id,
              template_exercise_id: ex.id,
              name: ex.exercise_name,
              cue_text: ex.cue_text ?? "Control the eccentric",
              progression_note: "Hold weight",
              rest_seconds: ex.rest_seconds,
              rep_min: ex.rep_min,
              rep_max: ex.rep_max,
              bodyweight: Boolean(templateRow.template_sets?.some((s) => s.is_bodyweight)),
              sets,
            };
          }),
        );
        setError("Demo mode: log UI works, but database save requires sign in.");
        setLoading(false);
        return;
      }
      const data = await res.json();
      const firstDay = data?.programs?.[0]?.program_days?.slice()?.sort((a: ProgramDayData, b: ProgramDayData) => a.order_index - b.order_index)?.[0] as ProgramDayData | undefined;
      if (!firstDay) {
        setLoading(false);
        setError("No program day found. Seed your program first.");
        return;
      }
      setDay(firstDay);
      const historyRes = await fetch("/api/history");
      if (historyRes.ok) {
        const historyData = await historyRes.json();
        const latestForDay = (historyData.history ?? []).find(
          (w: { program_day_id: string; ai_next_session_focus: string | null }) =>
            w.program_day_id === firstDay.id && w.ai_next_session_focus,
        );
        if (latestForDay?.ai_next_session_focus) {
          setNextSessionFocusBanner(latestForDay.ai_next_session_focus);
        }
      }

      const draftKey = `today-draft:${firstDay.id}`;
      const stored = window.localStorage.getItem(draftKey);
      if (stored) {
        setExercises(normalizeExercises(JSON.parse(stored) as ExerciseState[]));
      } else {
        setExercises(
          firstDay.template_exercises
            .slice()
            .sort((a, b) => a.order_index - b.order_index)
            .map((ex) => {
              const sets = buildInitialSetsFromTemplate(ex);
              return {
                id: ex.id,
                template_exercise_id: ex.id,
                name: ex.exercise_name,
                cue_text: ex.cue_text ?? "Control the eccentric",
                progression_note: "Hold weight",
                rest_seconds: ex.rest_seconds,
                rep_min: ex.rep_min,
                rep_max: ex.rep_max,
                bodyweight: Boolean(ex.template_sets?.some((s) => s.is_bodyweight)),
                sets,
              };
            }),
        );
      }
      setLoading(false);
    }
    loadToday();
  }, []);

  useEffect(() => {
    if (!day || exercises.length === 0) return;
    window.localStorage.setItem(`today-draft:${day.id}`, JSON.stringify(exercises));
  }, [day, exercises]);

  useEffect(() => {
    if (!workoutId) return;
    let wakeLock: { release: () => Promise<void> } | null = null;

    async function requestWakeLock() {
      if (!("wakeLock" in navigator)) return;
      if (document.visibilityState !== "visible") return;
      try {
        wakeLock = await (
          navigator as Navigator & {
            wakeLock: { request: (type: "screen") => Promise<{ release: () => Promise<void> }> };
          }
        ).wakeLock.request("screen");
      } catch {
        // Ignore unsupported or blocked wake lock requests.
      }
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void requestWakeLock();
      }
    };

    void requestWakeLock();
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      if (wakeLock) void wakeLock.release().catch(() => undefined);
    };
  }, [workoutId]);

  const allSets = useMemo(
    () =>
      exercises.flatMap((ex) =>
        ex.sets.map((set, idx) => ({
          template_exercise_id: ex.template_exercise_id,
          set_number: idx + 1,
          target_weight: set.target_weight,
          actual_weight: set.actual_weight,
          target_reps: set.target_reps,
          actual_reps: set.actual_reps,
          rir: set.rir,
          completed: set.completed,
        })),
      ),
    [exercises],
  );

  async function startRestTimer(label: string, seconds: number) {
    const exercise = exercises.find((e) => e.name === label);
    restTimerIdRef.current += 1;
    setActiveRest({
      exerciseId: exercise?.id ?? "unknown",
      exerciseName: label,
      durationSeconds: seconds,
      remainingSeconds: seconds,
      startedAt: new Date(Date.now() + restTimerIdRef.current).toISOString(),
    });
    void fetch("/api/rest-timer/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rest_seconds: seconds }),
    }).catch(() => undefined);
  }

  async function startWorkout() {
    const isDemoMode =
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("demo") === "1";
    if (workoutId || !day) return;
    if (isDemoMode) {
      setWorkoutId("demo-workout");
      setFinishMessage("Demo workout started. You can log and finish this session.");
      return;
    }
    const response = await fetch("/api/workouts/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ program_day_id: day.id }),
    });
    if (!response.ok) return;
    const data = await response.json();
    setWorkoutId(data.workout.id);
  }

  const uiExercises: ExerciseCardData[] = useMemo(
    () =>
      exercises.map((exercise) => ({
        id: exercise.id,
        name: exercise.name,
        cueText: exercise.cue_text,
        progressionHint: exercise.progression_note,
        restSeconds: exercise.rest_seconds,
        repRange: { min: exercise.rep_min, max: exercise.rep_max },
        sets: exercise.sets.map((set, idx) => ({
          id: set.id,
          setNumber: idx + 1,
          previousLabel: formatPlanLabel(
            Boolean(exercise.bodyweight),
            set.target_weight,
            set.target_reps,
          ),
          previousPerformance: {
            weight: exercise.bodyweight && set.target_weight === 0 ? null : set.target_weight,
            reps: set.target_reps ?? null,
            label: formatPlanLabel(
              Boolean(exercise.bodyweight),
              set.target_weight,
              set.target_reps,
            ),
          },
          targetWeight: set.target_weight,
          targetReps: set.target_reps,
          actualWeight: set.actual_weight ?? null,
          actualReps: set.actual_reps ?? null,
          rir: set.rir ?? null,
          completed: set.completed,
        })),
      })),
    [exercises],
  );

  function applyUpdateSet({ exerciseId, setId, field, value }: UpdateSetInput) {
    if (!setId) return;
    setExercises((prev) =>
      prev.map((ex) =>
        ex.id !== exerciseId
          ? ex
          : {
              ...ex,
              sets: ex.sets.map((set) =>
                set.id !== setId
                  ? set
                  : {
                      ...set,
                      ...(field === "actualWeight" ? { actual_weight: value ?? undefined } : {}),
                      ...(field === "actualReps" ? { actual_reps: value ?? undefined } : {}),
                      ...(field === "rir" ? { rir: value ?? undefined } : {}),
                    },
              ),
            },
      ),
    );
  }

  function requestSetFocus(
    exerciseId: string,
    setId: string,
    field: "actualWeight" | "actualReps" = "actualReps",
  ) {
    focusRequestRef.current += 1;
    setActiveRow({ exerciseId, setId });
    setFocusTarget({ exerciseId, setId, field, requestKey: focusRequestRef.current });
  }

  function applyCompleteSet({ exerciseId, setId, completed }: CompleteSetInput) {
    if (!setId) return;
    const exercise = exercises.find((e) => e.id === exerciseId);
    if (!exercise) return;
    const setIndex = exercise.sets.findIndex((set) => set.id === setId);
    if (setIndex < 0) return;
    const nextIncomplete = completed
      ? exercise.sets.slice(setIndex + 1).find((set) => !set.completed)
      : null;

    setExercises((prev) =>
      prev.map((ex) =>
        ex.id !== exerciseId
          ? ex
          : {
              ...ex,
              sets: ex.sets.map((set) =>
                set.id !== setId
                  ? set
                  : {
                      ...set,
                      completed,
                      ...(completed && (set.actual_weight === null || set.actual_weight === undefined)
                        ? { actual_weight: set.target_weight ?? undefined }
                        : {}),
                      ...(completed && (set.actual_reps === null || set.actual_reps === undefined)
                        ? { actual_reps: ex.rep_max ?? set.target_reps ?? undefined }
                        : {}),
                    },
              ),
            },
      ),
    );
    if (completed) {
      const completedSet = exercise.sets.find((s) => s.id === setId);
      const restSec = completedSet?.rest_seconds ?? exercise.rest_seconds;
      if (restSec > 0) {
        void startRestTimer(exercise.name, restSec);
      }
      if (nextIncomplete) {
        requestSetFocus(exerciseId, nextIncomplete.id, "actualReps");
      }
    }
  }

  function applyAddSet(exerciseId: string) {
    let createdSetId = "";
    setExercises((prev) =>
      prev.map((ex) => {
        if (ex.id !== exerciseId) return ex;
        const last = ex.sets[ex.sets.length - 1];
        const weightFromPrev = last?.actual_weight ?? last?.target_weight ?? undefined;
        const newSetId = crypto.randomUUID();
        createdSetId = newSetId;
        return {
          ...ex,
          sets: [
            ...ex.sets,
            {
              id: newSetId,
              target_weight: last?.target_weight ?? weightFromPrev ?? 0,
              target_reps: ex.rep_max,
              actual_weight: weightFromPrev,
              actual_reps: ex.rep_max,
              rest_seconds: last?.rest_seconds,
              completed: false,
            },
          ],
        };
      }),
    );
    if (createdSetId) requestSetFocus(exerciseId, createdSetId, "actualReps");
  }

  function applyUsePrevious({ exerciseId, setId, weight, reps }: UsePreviousInput) {
    if (!setId) return;
    setExercises((prev) =>
      prev.map((ex) =>
        ex.id !== exerciseId
          ? ex
          : {
              ...ex,
              sets: ex.sets.map((set) =>
                set.id !== setId
                  ? set
                  : {
                      ...set,
                      ...(weight !== null ? { actual_weight: weight } : {}),
                      ...(reps !== null ? { actual_reps: reps } : {}),
                    },
              ),
            },
      ),
    );
    requestSetFocus(exerciseId, setId, "actualReps");
  }

  function applyRemoveLastSet(exerciseId: string) {
    setExercises((prev) =>
      prev.map((ex) => {
        if (ex.id !== exerciseId) return ex;
        if (ex.sets.length <= 1) return ex;
        return { ...ex, sets: ex.sets.slice(0, -1) };
      }),
    );
  }

  return (
    <main>
      <WorkoutScreen
        workoutId={workoutId ?? "pending"}
        workoutName={day?.name ?? "Today"}
        startedAt=""
        elapsedSeconds={elapsed}
        exercises={uiExercises}
        nextSessionFocus={nextSessionFocusBanner}
        activeRestTimer={activeRest}
        isFinishing={finishing}
        onFinishWorkout={() => setShowFinish(true)}
        onUpdateSet={applyUpdateSet}
        onCompleteSet={applyCompleteSet}
        onUsePrevious={applyUsePrevious}
        onAddSet={applyAddSet}
        onRemoveLastSet={applyRemoveLastSet}
        activeRow={activeRow}
        focusTarget={focusTarget}
        onActiveRowChange={setActiveRow}
        onSkipRestTimer={() => setActiveRest(null)}
        onDismissRestTimer={() => setActiveRest(null)}
      />
      <div className="mx-auto w-full max-w-[430px] space-y-1.5 px-3 pb-28">
        {loading ? <p className="text-sm text-neutral-400">Loading today session...</p> : null}
        {error ? <p className="text-sm text-red-300">{error}</p> : null}
        {finishMessage ? <p className="text-[11px] text-neutral-500">{finishMessage}</p> : null}
        {coachSummary ? (
          <p className="text-[11px] text-neutral-500">
            Coach summary: {coachSummary}
          </p>
        ) : null}
        {!workoutId ? (
          <button className="h-10 w-full rounded-full bg-neutral-100 px-4 text-sm font-medium text-neutral-950" onClick={startWorkout} disabled={!day}>
            Start Workout
          </button>
        ) : null}
      </div>
      <PostWorkoutModal
        open={showFinish}
        submitting={finishing}
        onClose={() => setShowFinish(false)}
        onSubmit={async (review) => {
          const isDemoMode =
            typeof window !== "undefined" &&
            new URLSearchParams(window.location.search).get("demo") === "1";
          if (!workoutId) return;
          if (isDemoMode) {
            setFinishMessage("Demo mode complete. Sign in to save and run AI updates.");
            setCoachSummary(
              "Good pace and consistency. Keep technique tight and build reps before load.",
            );
            setShowFinish(false);
            setWorkoutId(null);
            return;
          }
          setFinishing(true);
          setFinishMessage("Saving workout...");
          const finishRes = await fetch("/api/workouts/finish", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ workout_id: workoutId, sets: allSets, ...review }),
          });
          if (finishRes.ok) {
            setFinishMessage("Workout saved. Generating coach update...");
            if (day) window.localStorage.removeItem(`today-draft:${day.id}`);
            setShowFinish(false);
            setWorkoutId(null);
            setFinishing(false);
            void (async () => {
              const aiRes = await fetch("/api/ai/update-next-session", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ workout_id: workoutId }),
              });
              const aiData = await aiRes.json().catch(() => ({}));
              if (!aiRes.ok) {
                setFinishMessage("Workout saved. Coach update unavailable right now.");
                return;
              }
              setFinishMessage(aiData?.message ?? "Updated next session.");
              setCoachSummary(aiData?.summary_note ?? null);
              setNextSessionFocusBanner(aiData?.next_session_focus ?? null);
            })();
            return;
          } else {
            setFinishMessage("Could not finish workout. Please retry.");
          }
          setFinishing(false);
          setShowFinish(false);
        }}
      />
      <BottomNav />
    </main>
  );
}
