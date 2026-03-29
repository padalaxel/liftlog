"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { BottomNav } from "@/components/workout/BottomNav";
import { CoachDebriefModal } from "@/components/workout/CoachDebriefModal";
import { NumericEntrySheet } from "@/components/workout/numeric-entry/NumericEntrySheet";
import { PostWorkoutModal } from "@/components/workout/PostWorkoutModal";
import { WorkoutScreen } from "@/components/workout/WorkoutScreen";
import type { NumericEntryBridgeApi } from "@/hooks/useNumericEntry";
import { NumericEntryProvider } from "@/hooks/useNumericEntry";
import {
  clearActiveWorkoutSession,
  readActiveWorkoutSession,
  writeActiveWorkoutSession,
} from "@/lib/active-workout-session";
import { MOCK_PROGRAM_DAYS } from "@/lib/mock-data";
import { pickLatestFinishedWorkout, pickSuggestedProgramDay } from "@/lib/next-suggested-program-day";
import { coachStructuredPayloadSchema } from "@/lib/validation";
import type { CoachStructuredPayload } from "@/lib/validation";
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
    repRangeMin?: number;
    repRangeMax?: number;
    target_weight: number;
    cue_text: string | null;
    rest_seconds: number;
    template_sets?: TemplateSetRow[] | null;
  }>;
};

function mapDemoDayToProgramDayData(day: (typeof MOCK_PROGRAM_DAYS)[number]): ProgramDayData {
  return {
    id: day.id,
    name: day.name,
    order_index: day.order_index,
    template_exercises: day.template_exercises.map((ex) => ({
      id: ex.id,
      exercise_name: ex.exercise_name,
      order_index: ex.order_index,
      target_sets: ex.target_sets,
      rep_min: ex.rep_min,
      rep_max: ex.rep_max,
      repRangeMin: ex.repRangeMin,
      repRangeMax: ex.repRangeMax,
      target_weight: ex.target_weight,
      cue_text: ex.cue_text,
      rest_seconds: ex.rest_seconds,
      template_sets: ex.template_sets,
    })),
  };
}

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

function parseCoachStructuredFromApi(data: unknown): CoachStructuredPayload | null {
  if (!data || typeof data !== "object") return null;
  const o = data as Record<string, unknown>;
  const parsed = coachStructuredPayloadSchema.safeParse({
    session_summary: o.session_summary,
    exercise_adjustments: o.exercise_adjustments,
    next_session_focus: o.next_session_focus,
    recovery: o.recovery,
  });
  return parsed.success ? parsed.data : null;
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

function todayHref(dayId: string, isDemo: boolean) {
  const params = new URLSearchParams();
  params.set("dayId", dayId);
  if (isDemo) params.set("demo", "1");
  return `/today?${params.toString()}`;
}

function TodayWorkoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dayIdParam = searchParams.get("dayId");
  const isDemoMode = searchParams.get("demo") === "1";
  const [elapsed, setElapsed] = useState(0);
  const [showFinish, setShowFinish] = useState(false);
  const [workoutId, setWorkoutId] = useState<string | null>(null);
  const [day, setDay] = useState<ProgramDayData | null>(null);
  const [exercises, setExercises] = useState<ExerciseState[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [finishMessage, setFinishMessage] = useState<string | null>(null);
  const [nextSessionFocusBanner, setNextSessionFocusBanner] = useState<string | null>(null);
  const [finishing, setFinishing] = useState(false);
  const [debriefOpen, setDebriefOpen] = useState(false);
  const [debriefPhase, setDebriefPhase] = useState<"loading" | "ready" | "error">("loading");
  const [debriefPayload, setDebriefPayload] = useState<CoachStructuredPayload | null>(null);
  const [debriefWorkoutId, setDebriefWorkoutId] = useState<string | null>(null);
  const [debriefRetryBusy, setDebriefRetryBusy] = useState(false);
  const [activeRest, setActiveRest] = useState<ActiveRestTimer | null>(null);
  const [activeRow, setActiveRow] = useState<ActiveRowTarget>(null);
  const [focusTarget, setFocusTarget] = useState<FocusTarget>(null);
  const restTimerIdRef = useRef(0);
  const focusRequestRef = useRef(0);
  const numericBridgeRef = useRef<NumericEntryBridgeApi | null>(null);
  const [sessionConflict, setSessionConflict] = useState<{
    otherDayId: string;
    otherName: string;
    isDemo: boolean;
  } | null>(null);

  useEffect(() => {
    const id = window.setInterval(() => setElapsed((v) => v + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    async function loadToday() {
      setLoading(true);
      setError(null);
      setDebriefOpen(false);
      const res = await fetch("/api/programs");
      if (!res.ok) {
        const sortedDemo = MOCK_PROGRAM_DAYS.slice().sort((a, b) => a.order_index - b.order_index);
        let selected = pickSuggestedProgramDay(sortedDemo, null);
        if (dayIdParam) {
          const found = sortedDemo.find((d) => d.id === dayIdParam);
          if (found) selected = found;
        }
        const mapped = mapDemoDayToProgramDayData(selected);
        setDay(mapped);

        const session = readActiveWorkoutSession();
        const relevant = Boolean(session && session.isDemo === isDemoMode);
        if (relevant && session!.workoutId && session!.programDayId !== mapped.id) {
          const otherName =
            MOCK_PROGRAM_DAYS.find((d) => d.id === session!.programDayId)?.name ?? "Another workout";
          setSessionConflict({
            otherDayId: session!.programDayId,
            otherName,
            isDemo: isDemoMode,
          });
          setWorkoutId(null);
        } else if (relevant && session?.workoutId && session.programDayId === mapped.id) {
          setSessionConflict(null);
          setWorkoutId(session.workoutId);
        } else {
          setSessionConflict(null);
          setWorkoutId(null);
        }

        const draftKey = `today-draft:${mapped.id}`;
        const stored = window.localStorage.getItem(draftKey);
        if (stored) {
          setExercises(normalizeExercises(JSON.parse(stored) as ExerciseState[]));
        } else {
          setExercises(
            selected.template_exercises.map((ex) => {
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
        }
        setError("Demo mode: log UI works, but database save requires sign in.");
        setLoading(false);
        return;
      }
      const data = await res.json();
      const programDays = (data?.programs?.[0]?.program_days ?? [])
        .slice()
        .sort((a: ProgramDayData, b: ProgramDayData) => a.order_index - b.order_index) as ProgramDayData[];
      if (programDays.length === 0) {
        setLoading(false);
        setError("No program day found. Seed your program first.");
        return;
      }

      const historyRes = await fetch("/api/history");
      let suggestedDay = programDays[0];
      if (historyRes.ok) {
        const historyData = await historyRes.json();
        const history = (historyData.history ?? []) as Array<{
          program_day_id: string;
          finished_at: string | null;
          ai_next_session_focus?: string | null;
        }>;
        const lastFinished = pickLatestFinishedWorkout(history);
        suggestedDay = pickSuggestedProgramDay(programDays, lastFinished);
        let selectedDay = suggestedDay;
        if (dayIdParam) {
          const found = programDays.find((d) => d.id === dayIdParam);
          if (found) selectedDay = found;
        }
        const latestForDay = history.find(
          (w) => w.program_day_id === selectedDay.id && w.ai_next_session_focus,
        );
        if (latestForDay?.ai_next_session_focus) {
          setNextSessionFocusBanner(latestForDay.ai_next_session_focus);
        }

        setDay(selectedDay);

        const session = readActiveWorkoutSession();
        const relevant = Boolean(session && session.isDemo !== true);
        if (relevant && session!.workoutId && session!.programDayId !== selectedDay.id) {
          const otherName =
            programDays.find((d) => d.id === session!.programDayId)?.name ?? "Another workout";
          setSessionConflict({
            otherDayId: session!.programDayId,
            otherName,
            isDemo: false,
          });
          setWorkoutId(null);
        } else if (relevant && session?.workoutId && session.programDayId === selectedDay.id) {
          setSessionConflict(null);
          setWorkoutId(session.workoutId);
        } else {
          setSessionConflict(null);
          setWorkoutId(null);
        }

        const draftKey = `today-draft:${selectedDay.id}`;
        const stored = window.localStorage.getItem(draftKey);
        if (stored) {
          setExercises(normalizeExercises(JSON.parse(stored) as ExerciseState[]));
        } else {
          setExercises(
            selectedDay.template_exercises
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
        return;
      }

      let selectedDay = suggestedDay;
      if (dayIdParam) {
        const found = programDays.find((d) => d.id === dayIdParam);
        if (found) selectedDay = found;
      }
      setDay(selectedDay);

      const session = readActiveWorkoutSession();
      const relevant = Boolean(session && session.isDemo !== true);
      if (relevant && session!.workoutId && session!.programDayId !== selectedDay.id) {
        const otherName =
          programDays.find((d) => d.id === session!.programDayId)?.name ?? "Another workout";
        setSessionConflict({
          otherDayId: session!.programDayId,
          otherName,
          isDemo: false,
        });
        setWorkoutId(null);
      } else if (relevant && session?.workoutId && session.programDayId === selectedDay.id) {
        setSessionConflict(null);
        setWorkoutId(session.workoutId);
      } else {
        setSessionConflict(null);
        setWorkoutId(null);
      }

      const draftKey = `today-draft:${selectedDay.id}`;
      const stored = window.localStorage.getItem(draftKey);
      if (stored) {
        setExercises(normalizeExercises(JSON.parse(stored) as ExerciseState[]));
      } else {
        setExercises(
          selectedDay.template_exercises
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
    void loadToday();
  }, [dayIdParam, isDemoMode]);

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

  async function startRestTimer(exerciseName: string, seconds: number, completedSetId: string) {
    const exercise = exercises.find((e) => e.name === exerciseName);
    restTimerIdRef.current += 1;
    setActiveRest({
      exerciseId: exercise?.id ?? "unknown",
      setId: completedSetId,
      exerciseName,
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

  useEffect(() => {
    if (!activeRest) return;
    const id = window.setInterval(() => {
      setActiveRest((prev) => {
        if (!prev) return null;
        const next = prev.remainingSeconds - 1;
        return next <= 0 ? null : { ...prev, remainingSeconds: next };
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [activeRest?.startedAt]);

  async function startWorkout() {
    if (workoutId || !day) return;
    setDebriefOpen(false);
    if (isDemoMode) {
      setWorkoutId("demo-workout");
      writeActiveWorkoutSession({
        workoutId: "demo-workout",
        programDayId: day.id,
        programDayName: day.name,
        startedAt: new Date().toISOString(),
        isDemo: true,
      });
      setFinishMessage("Demo workout started. You can log and finish this session.");
      return;
    }
    const response = await fetch("/api/workouts/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ program_day_id: day.id }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const msg =
        typeof data?.error === "string"
          ? data.error
          : response.status === 401
            ? "Sign in to start a workout."
            : "Could not start workout. Try again.";
      setFinishMessage(msg);
      return;
    }
    if (data?.workout?.id) {
      setWorkoutId(data.workout.id);
      writeActiveWorkoutSession({
        workoutId: data.workout.id,
        programDayId: day.id,
        programDayName: day.name,
        startedAt: new Date().toISOString(),
        isDemo: false,
      });
    }
  }

  async function runCoachAfterSave(savedId: string) {
    setDebriefOpen(true);
    setDebriefPhase("loading");
    setDebriefPayload(null);
    setDebriefWorkoutId(savedId);
    try {
      const aiRes = await fetch("/api/ai/update-next-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workout_id: savedId }),
      });
      const aiData = await aiRes.json().catch(() => ({}));
      if (!aiRes.ok) {
        setDebriefPhase("error");
        const detail =
          typeof aiData?.message === "string" && aiData.message.length > 0
            ? aiData.message
            : `${aiRes.status} ${aiRes.statusText || ""}`.trim();
        setFinishMessage(`Workout saved. Coach step failed (${detail}).`);
        return;
      }
      const structured = parseCoachStructuredFromApi(aiData);
      if (!structured) {
        setDebriefPhase("error");
        setFinishMessage("Workout saved. Coach response was incomplete.");
        return;
      }
      setDebriefPayload(structured);
      setDebriefPhase("ready");
      setFinishMessage(typeof aiData?.message === "string" ? aiData.message : "Updated next session.");
      const text =
        typeof aiData?.next_session_focus_text === "string" ? aiData.next_session_focus_text : null;
      if (text) setNextSessionFocusBanner(text);
    } catch {
      setDebriefPhase("error");
      setFinishMessage("Workout saved. Could not reach coach service.");
    }
  }

  async function retryDebriefCoach() {
    if (!debriefWorkoutId) return;
    setDebriefRetryBusy(true);
    setDebriefPhase("loading");
    try {
      const aiRes = await fetch("/api/ai/update-next-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workout_id: debriefWorkoutId }),
      });
      const aiData = await aiRes.json().catch(() => ({}));
      if (!aiRes.ok) {
        setDebriefPhase("error");
        return;
      }
      const structured = parseCoachStructuredFromApi(aiData);
      if (!structured) {
        setDebriefPhase("error");
        return;
      }
      setDebriefPayload(structured);
      setDebriefPhase("ready");
      const text =
        typeof aiData?.next_session_focus_text === "string" ? aiData.next_session_focus_text : null;
      if (text) setNextSessionFocusBanner(text);
    } finally {
      setDebriefRetryBusy(false);
    }
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

  function applyCompleteSet({
    exerciseId,
    setId,
    completed,
    skipAutoFocus,
  }: CompleteSetInput) {
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
        void startRestTimer(exercise.name, restSec, setId);
      }
      if (nextIncomplete && !skipAutoFocus) {
        requestSetFocus(exerciseId, nextIncomplete.id, "actualReps");
      }
    }
  }

  /** Strong-like: always start the next set on weight (user can adjust before reps). */
  function openKeypadForNextSet(exerciseId: string, set: ExerciseState["sets"][number]) {
    const init = set.actual_weight ?? set.target_weight ?? null;
    numericBridgeRef.current?.openWeight(exerciseId, set.id, init);
  }

  function handleRepsNextFromKeypad({ exerciseId, setId }: { exerciseId: string; setId: string }) {
    const exercise = exercises.find((e) => e.id === exerciseId);
    if (!exercise) return;
    const setIndex = exercise.sets.findIndex((s) => s.id === setId);
    if (setIndex < 0) return;
    const row = exercise.sets[setIndex];
    const nextIncomplete = exercise.sets.slice(setIndex + 1).find((s) => !s.completed);

    if (row.completed) {
      if (nextIncomplete) {
        requestAnimationFrame(() => openKeypadForNextSet(exerciseId, nextIncomplete));
      }
      return;
    }

    applyCompleteSet({
      exerciseId,
      setId,
      completed: true,
      skipAutoFocus: true,
    });
    if (nextIncomplete) {
      requestAnimationFrame(() => openKeypadForNextSet(exerciseId, nextIncomplete));
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
      <NumericEntryProvider
        exercises={uiExercises}
        onCommit={(exerciseId, setId, field, value) => {
          applyUpdateSet({ exerciseId, setId, field, value });
        }}
        onLiveChange={(input) => {
          applyUpdateSet({
            exerciseId: input.exerciseId,
            setId: input.setId,
            field: input.field,
            value: input.value,
          });
        }}
        onRepsNext={handleRepsNextFromKeypad}
        registerNumericApi={(api) => {
          numericBridgeRef.current = api;
        }}
        syncFocus={requestSetFocus}
      >
      {sessionConflict ? (
        <div className="mx-auto mb-2 w-full max-w-[430px] space-y-2 rounded-lg border border-amber-800/60 bg-amber-950/40 px-3 py-3 text-sm text-amber-100">
          <p>
            You have <span className="font-semibold">{sessionConflict.otherName}</span> in progress.
          </p>
          <div className="flex flex-col gap-2">
            <Link
              href={todayHref(sessionConflict.otherDayId, sessionConflict.isDemo)}
              className="flex h-10 items-center justify-center rounded-full bg-amber-100 text-sm font-semibold text-amber-950"
            >
              Continue that workout
            </Link>
            <button
              type="button"
              className="h-10 rounded-full border border-amber-700/80 text-sm font-medium text-amber-200"
              onClick={() => {
                clearActiveWorkoutSession();
                setSessionConflict(null);
                setWorkoutId(null);
              }}
            >
              Discard saved session and use this day
            </button>
          </div>
        </div>
      ) : null}
      <WorkoutScreen
        workoutId={workoutId ?? "pending"}
        workoutName={day?.name ?? "Today"}
        startedAt=""
        elapsedSeconds={elapsed}
        exercises={uiExercises}
        inlineRestTimer={activeRest}
        nextSessionFocus={nextSessionFocusBanner}
        isFinishing={finishing}
        canFinish={Boolean(workoutId)}
        onBack={() => router.push("/home")}
        startWorkoutSlot={
          !loading && !workoutId && day ? (
            <button
              type="button"
              className="h-11 w-full rounded-full bg-neutral-100 px-4 text-base font-semibold text-neutral-950 shadow-sm active:scale-[0.99] disabled:opacity-50"
              onClick={startWorkout}
              disabled={!day}
            >
              Start Workout
            </button>
          ) : null
        }
        onFinishWorkout={() => setShowFinish(true)}
        onUpdateSet={applyUpdateSet}
        onCompleteSet={applyCompleteSet}
        onUsePrevious={applyUsePrevious}
        onAddSet={applyAddSet}
        onRemoveLastSet={applyRemoveLastSet}
        activeRow={activeRow}
        focusTarget={focusTarget}
        onActiveRowChange={setActiveRow}
      />
      <NumericEntrySheet />
      <div className="mx-auto w-full max-w-[430px] space-y-1.5 px-3 pb-28">
        {loading ? <p className="text-sm text-neutral-400">Loading today session...</p> : null}
        {error ? <p className="text-sm text-red-300">{error}</p> : null}
        {finishMessage ? <p className="text-[11px] text-neutral-500">{finishMessage}</p> : null}
      </div>
      <PostWorkoutModal
        open={showFinish}
        submitting={finishing}
        onClose={() => setShowFinish(false)}
        onSubmit={async (review) => {
          if (!workoutId) {
            setShowFinish(false);
            setFinishMessage('Tap "Start Workout" first so your session can be saved.');
            return;
          }
          if (isDemoMode) {
            clearActiveWorkoutSession();
            setFinishMessage("Demo mode complete. Sign in to save and run AI updates.");
            setShowFinish(false);
            setWorkoutId(null);
            setDebriefOpen(true);
            setDebriefPhase("ready");
            setDebriefWorkoutId(null);
            setDebriefPayload({
              session_summary:
                "Demo session complete. Sign in to link real workouts, history, and full AI coaching.",
              exercise_adjustments: [
                {
                  exercise_name: "Your lifts",
                  decision: "Hold",
                  why: "Demo mode does not persist sets to your account. Coaching will reference real reps, loads, and history after sign-in.",
                  next_session_target: "Sign in → save a workout → finish to generate notes",
                  focus: "Log every working set once your program is linked.",
                },
              ],
              next_session_focus: [
                "Sign in to persist sessions",
                "Log every working set for accurate progression",
                "Finish a workout to auto-open this debrief",
              ],
              recovery: "Recovery is not assessed in demo mode.",
            });
            return;
          }
          const savedWorkoutId = workoutId;
          setFinishing(true);
          setFinishMessage("Saving workout...");
          let finishRes: Response;
          try {
            finishRes = await fetch("/api/workouts/finish", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ workout_id: savedWorkoutId, sets: allSets, ...review }),
            });
          } catch {
            setFinishing(false);
            setShowFinish(false);
            setFinishMessage("Network error while saving. Check your connection and try again.");
            return;
          }
          if (finishRes.ok) {
            clearActiveWorkoutSession();
            if (day) window.localStorage.removeItem(`today-draft:${day.id}`);
            setShowFinish(false);
            setWorkoutId(null);
            setFinishing(false);
            setFinishMessage("Workout saved.");
            void runCoachAfterSave(savedWorkoutId);
            return;
          }
          const errBody = await finishRes.json().catch(() => ({}));
          const detail =
            typeof errBody?.error === "string" ? errBody.error : finishRes.statusText || "Unknown error";
          setFinishMessage(`Could not save workout: ${detail}`);
          setFinishing(false);
          setShowFinish(false);
        }}
      />
      <CoachDebriefModal
        open={debriefOpen}
        phase={debriefPhase}
        structured={debriefPayload}
        onClose={() => setDebriefOpen(false)}
        onRetry={debriefWorkoutId ? retryDebriefCoach : undefined}
        retryBusy={debriefRetryBusy}
      />
      <BottomNav />
      </NumericEntryProvider>
    </main>
  );
}

export default function TodayPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto min-h-screen max-w-md p-4 pb-24">
          <p className="text-sm text-zinc-400">Loading workout…</p>
          <BottomNav />
        </main>
      }
    >
      <TodayWorkoutContent />
    </Suspense>
  );
}
