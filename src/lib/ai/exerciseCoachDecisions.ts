import { normalizeCoachExerciseName } from "@/lib/ai/coachExerciseName";
import type { ExerciseHistoryForCoach } from "@/types/coach-history";
import type { AIUpdatePayload } from "@/lib/validation";

export type CoachDecision = "add_load" | "hold" | "reduce_load";

export type CoachExerciseDecision = {
  exercise_name: string;
  rep_min: number;
  rep_max: number;
  current_sets: Array<{ weight: number | null; reps: number | null }>;
  previous_session: { sets: Array<{ weight: number | null; reps: number | null }> } | null;
  decision: CoachDecision;
  all_sets_hit_top_of_range: boolean;
  all_sets_in_range: boolean;
  rep_dropoff_across_sets: number;
  next_target_weight: number | null;
  current_working_weight: number;
  increment_lbs: number;
  why_signals: string[];
};

type TemplateExerciseRow = {
  exercise_name: string;
  target_sets: number;
  rep_min: number;
  rep_max: number;
  target_weight: number;
  increment_lbs: number;
  rest_seconds: number;
  progression_rule: string;
  cue_text?: string | null;
};

type WorkoutExerciseRow = {
  exercise_name: string;
  planned_sets: number;
  rep_range: string;
  planned_weight: number;
  actual_sets: Array<{
    set_number: number;
    weight: number | null;
    reps: number | null;
    rir: number | null;
  }>;
};

function numOrUndef(v: number | null | undefined): number | undefined {
  if (v === null || v === undefined) return undefined;
  return Number.isFinite(v) ? v : undefined;
}

function didAllSetsHitTopOfRange(workingReps: number[], repMax: number): boolean {
  if (workingReps.length === 0) return false;
  return workingReps.every((r) => r >= repMax);
}

function didAllSetsStayInRange(
  workingReps: number[],
  repMin: number,
  repMax: number,
): boolean {
  if (workingReps.length === 0) return false;
  return workingReps.every((r) => r >= repMin && r <= repMax);
}

function getRepDropoffAcrossSets(workingReps: number[]): number {
  if (workingReps.length < 2) return 0;
  return workingReps[0] - workingReps[workingReps.length - 1];
}

function medianWeight(weights: number[]): number | null {
  if (weights.length === 0) return null;
  const s = [...weights].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function nextTargetWeight(input: {
  decision: CoachDecision;
  currentWeight: number;
  incrementLbs: number;
}): number | null {
  const inc = input.incrementLbs > 0 ? input.incrementLbs : 5;
  if (input.decision === "add_load") {
    return Math.round((input.currentWeight + inc) * 1000) / 1000;
  }
  if (input.decision === "reduce_load") {
    return Math.max(0, Math.round((input.currentWeight - inc) * 1000) / 1000);
  }
  return Math.round(input.currentWeight * 1000) / 1000;
}

function workingRepsFromActual(
  actualSets: WorkoutExerciseRow["actual_sets"],
): { reps: number[]; weights: number[] } {
  const sorted = [...actualSets].sort((a, b) => a.set_number - b.set_number);
  const reps: number[] = [];
  const weights: number[] = [];
  for (const row of sorted) {
    const r = numOrUndef(row.reps);
    if (r === undefined) continue;
    reps.push(r);
    const w = numOrUndef(row.weight);
    if (w !== undefined) weights.push(w);
  }
  return { reps, weights };
}

function countBelowMin(reps: number[], repMin: number): number {
  return reps.filter((r) => r < repMin).length;
}

function computeExerciseDecision(input: {
  programExercise: TemplateExerciseRow;
  workoutExercise: WorkoutExerciseRow;
  previousSessionSets: Array<{ weight: number | null; reps: number | null }> | null;
  sessionDifficulty: string | null;
  hasPriorSessionsForExercise: boolean;
}): CoachExerciseDecision {
  const { reps, weights } = workingRepsFromActual(input.workoutExercise.actual_sets);
  const repMin = input.programExercise.rep_min;
  const repMax = input.programExercise.rep_max;
  const templateWeight = Number(input.programExercise.target_weight);
  const inc = Number(input.programExercise.increment_lbs) || 5;

  const currentWorkingWeight = medianWeight(weights) ?? templateWeight;

  const all_sets_hit_top_of_range = didAllSetsHitTopOfRange(reps, repMax);
  const all_sets_in_range =
    reps.length > 0 ? didAllSetsStayInRange(reps, repMin, repMax) : false;
  const rep_dropoff_across_sets = getRepDropoffAcrossSets(reps);

  const belowMin = countBelowMin(reps, repMin);
  const lastRep = reps.length ? reps[reps.length - 1] : null;
  const failed = input.sessionDifficulty === "failed";
  const hard = input.sessionDifficulty === "hard";

  const why_signals: string[] = [];
  if (reps.length === 0) why_signals.push("no_completed_working_sets");
  if (all_sets_hit_top_of_range) why_signals.push("all_sets_at_or_above_rep_max");
  if (all_sets_in_range && !all_sets_hit_top_of_range) why_signals.push("in_range_not_all_at_top");
  if (belowMin > 0) why_signals.push(`sets_below_rep_min:${belowMin}`);
  if (rep_dropoff_across_sets >= 3) why_signals.push(`rep_dropoff:${rep_dropoff_across_sets}`);
  if (!input.hasPriorSessionsForExercise) why_signals.push("no_prior_session_for_exercise");

  let decision: CoachDecision = "hold";

  const materiallyBelowFloor = lastRep !== null && lastRep < repMin - 2;

  const reduceNoPrior =
    belowMin >= 2 || (belowMin >= 1 && failed) || materiallyBelowFloor;

  const reduceWithPrior =
    reduceNoPrior ||
    (belowMin >= 1 && hard && lastRep !== null && lastRep < repMin);

  const shouldReduce = input.hasPriorSessionsForExercise ? reduceWithPrior : reduceNoPrior;

  if (reps.length === 0) {
    decision = "hold";
  } else if (all_sets_hit_top_of_range && !failed) {
    decision = "add_load";
  } else if (shouldReduce) {
    decision = "reduce_load";
  } else {
    decision = "hold";
  }

  const next_target_weight = nextTargetWeight({
    decision,
    currentWeight: currentWorkingWeight,
    incrementLbs: inc,
  });

  const current_sets = input.workoutExercise.actual_sets
    .sort((a, b) => a.set_number - b.set_number)
    .map((s) => ({ weight: s.weight, reps: s.reps }));

  return {
    exercise_name: input.programExercise.exercise_name,
    rep_min: repMin,
    rep_max: repMax,
    current_sets,
    previous_session: input.previousSessionSets?.length
      ? { sets: input.previousSessionSets }
      : null,
    decision,
    all_sets_hit_top_of_range,
    all_sets_in_range,
    rep_dropoff_across_sets,
    next_target_weight,
    current_working_weight: currentWorkingWeight,
    increment_lbs: inc,
    why_signals,
  };
}

export function computeExerciseDecisionsForCoach(input: {
  workoutExercises: WorkoutExerciseRow[];
  programExercises: TemplateExerciseRow[];
  exerciseHistory: ExerciseHistoryForCoach[];
  sessionDifficulty: string | null;
}): CoachExerciseDecision[] {
  const out: CoachExerciseDecision[] = [];
  const n = Math.min(input.programExercises.length, input.workoutExercises.length);
  for (let i = 0; i < n; i++) {
    const pe = input.programExercises[i];
    const we = input.workoutExercises[i];
    const norm = normalizeCoachExerciseName(pe.exercise_name);
    const hist = input.exerciseHistory.find(
      (h) => normalizeCoachExerciseName(h.exercise_name) === norm,
    );
    const hasPrior = (hist?.sessions?.length ?? 0) > 0;
    const prev = hist?.sessions?.[0];
    const previousSessionSets = prev
      ? prev.set_results.map((s) => ({ weight: s.weight, reps: s.reps }))
      : null;

    out.push(
      computeExerciseDecision({
        programExercise: pe,
        workoutExercise: we,
        previousSessionSets,
        sessionDifficulty: input.sessionDifficulty,
        hasPriorSessionsForExercise: hasPrior,
      }),
    );
  }
  return out;
}

function decisionToProgressionStatus(
  d: CoachDecision,
): "progress" | "hold" | "reduce_volume" | "deload" {
  if (d === "add_load") return "progress";
  if (d === "reduce_load") return "deload";
  return "hold";
}

function progressionReasonFromDecision(d: CoachExerciseDecision): string {
  if (d.decision === "add_load") return `Add ${d.increment_lbs || 5} lb — all sets hit top of range`;
  if (d.decision === "reduce_load") return `Reduce ${d.increment_lbs || 5} lb — rep quality below range`;
  return "Hold load until all working sets reach the top of the rep range";
}

export function buildTemplateExercisesFromDecisions(
  templates: TemplateExerciseRow[],
  decisions: CoachExerciseDecision[],
): AIUpdatePayload["exercises"] {
  const byName = new Map(decisions.map((d) => [normalizeCoachExerciseName(d.exercise_name), d]));
  return templates.map((t) => {
    const d = byName.get(normalizeCoachExerciseName(t.exercise_name));
    const w =
      d?.next_target_weight !== null && d?.next_target_weight !== undefined
        ? d.next_target_weight
        : Number(t.target_weight);
    const status = d ? decisionToProgressionStatus(d.decision) : "hold";
    const reason = d ? progressionReasonFromDecision(d) : "Hold load";
    return {
      exercise_name: t.exercise_name,
      target_sets: t.target_sets,
      rep_min: t.rep_min,
      rep_max: t.rep_max,
      target_weight: w,
      rest_seconds: t.rest_seconds,
      cue_text: (t.cue_text ?? "").slice(0, 80),
      progression_status: status,
      progression_reason: reason.slice(0, 150),
    };
  });
}

function formatDecisionLabel(d: CoachDecision): string {
  if (d === "add_load") return "Add load";
  if (d === "reduce_load") return "Reduce load";
  return "Hold";
}

function formatNextSessionTargetLine(d: CoachExerciseDecision): string {
  const w = d.next_target_weight ?? d.current_working_weight;
  if (d.decision === "add_load") {
    return `${w} lb — all working sets to ${d.rep_max} reps before next bump`;
  }
  if (d.decision === "reduce_load") {
    return `${w} lb × ${d.rep_min}–${d.rep_max} reps, own reps before reloading`;
  }
  return `${w} lb × ${d.rep_min}–${d.rep_max} reps; bring every set to ${d.rep_max} before adding weight`;
}

export function mergeExerciseAdjustmentsWithDecisions(
  llmAdjustments: AIUpdatePayload["exercise_adjustments"],
  decisions: CoachExerciseDecision[],
  templateOrder: Array<{ exercise_name: string }>,
): AIUpdatePayload["exercise_adjustments"] {
  const llmBy = new Map(llmAdjustments.map((a) => [normalizeCoachExerciseName(a.exercise_name), a]));
  const decBy = new Map(decisions.map((d) => [normalizeCoachExerciseName(d.exercise_name), d]));

  return templateOrder.map((t) => {
    const key = normalizeCoachExerciseName(t.exercise_name);
    const d = decBy.get(key);
    const llm = llmBy.get(key);
    const decisionLabel = d ? formatDecisionLabel(d.decision) : "Hold";
    const nextLine = d ? formatNextSessionTargetLine(d) : "Same as program";
    const why =
      llm?.why && llm.why.length >= 10
        ? llm.why
        : d
          ? `Signals: ${d.why_signals.join(", ") || "ok"}. Decision: ${decisionLabel}.`
          : "Not enough data for a tailored note; follow the program targets.";
    const focus = llm?.focus?.trim() ?? "";
    return {
      exercise_name: t.exercise_name,
      decision: decisionLabel,
      why,
      next_session_target: nextLine,
      focus,
    };
  });
}
