type TemplateExerciseRow = {
  id: string;
  exercise_name: string;
  target_sets: number;
  rep_min: number;
  rep_max: number;
  target_weight: number;
  increment_lbs: number;
  rest_seconds: number;
  cue_text: string | null;
  progression_rule: string;
};

type WorkoutSetRow = {
  template_exercise_id: string;
  actual_reps: number | null;
  completed: boolean;
};

type Difficulty = "easy" | "good" | "hard" | "failed" | null;

export function buildFallbackProgression(
  templates: TemplateExerciseRow[],
  sets: WorkoutSetRow[],
  difficulty: Difficulty,
) {
  const summaryParts: string[] = [];
  const detailedParts: string[] = [];
  const updates = templates.map((template) => {
    const relevantSets = sets.filter(
      (s) => s.template_exercise_id === template.id && s.completed,
    );
    const hitTopRange =
      relevantSets.length >= template.target_sets &&
      relevantSets.every((s) => (s.actual_reps ?? 0) >= template.rep_max);
    const missedFloor = relevantSets.some((s) => (s.actual_reps ?? 0) < template.rep_min);
    const avgReps =
      relevantSets.length > 0
        ? relevantSets.reduce((acc, s) => acc + (s.actual_reps ?? 0), 0) / relevantSets.length
        : 0;

    let targetWeight = Number(template.target_weight);
    let targetSets = template.target_sets;
    let progressionStatus: "progress" | "hold" | "reduce_volume" | "deload" = "hold";
    let progressionReason = "Hold weight";
    let cueText = template.cue_text ?? "Control the eccentric";

    if (hitTopRange && (difficulty === "easy" || difficulty === "good")) {
      targetWeight += Number(template.increment_lbs || 5);
      progressionStatus = "progress";
      progressionReason = `Add ${Number(template.increment_lbs || 5)} lb`;
      summaryParts.push(`${template.exercise_name}: add load`);
      detailedParts.push(
        `${template.exercise_name}: all completed sets reached the top of ${template.rep_min}-${template.rep_max}, so load increases conservatively by ${Number(template.increment_lbs || 5)} lb.`,
      );
    } else if (difficulty === "hard" || difficulty === "failed" || missedFloor) {
      if (template.target_sets > 2) {
        targetSets = template.target_sets - 1;
        progressionStatus = "reduce_volume";
        progressionReason = "Reduce 1 set";
        detailedParts.push(
          `${template.exercise_name}: rep quality/effort signals are below progression threshold, so volume is reduced by one set before changing structure.`,
        );
      } else {
        targetWeight = Math.max(0, targetWeight - Number(template.increment_lbs || 5));
        progressionStatus = "deload";
        progressionReason = `Deload ${Number(template.increment_lbs || 5)} lb`;
        detailedParts.push(
          `${template.exercise_name}: with low-set structure and fatigue signals, load is deloaded by ${Number(template.increment_lbs || 5)} lb to restore rep quality.`,
        );
      }
      cueText = "Control the eccentric";
      summaryParts.push(`${template.exercise_name}: reduce fatigue`);
    } else {
      detailedParts.push(
        `${template.exercise_name}: held load because average completed reps (${avgReps.toFixed(
          1,
        )}) did not clearly exceed the progression threshold for this rep range.`,
      );
    }

    return {
      exercise_name: template.exercise_name,
      target_sets: targetSets,
      rep_min: template.rep_min,
      rep_max: template.rep_max,
      target_weight: targetWeight,
      rest_seconds: template.rest_seconds,
      cue_text: cueText,
      progression_status: progressionStatus,
      progression_reason: progressionReason,
    };
  });

  const summary_note =
    summaryParts.length > 0
      ? `Session summary: ${summaryParts.slice(0, 3).join("; ")}.`
      : "Session summary: maintain current loads and focus on execution quality.";

  return {
    summary_note,
    detailed_feedback: `Session review: progression is tied to completed-set performance, not isolated best sets. ${detailedParts
      .slice(0, 5)
      .join(" ")} Success next session is cleaner final-set execution with stable reps before forcing larger load jumps.`,
    next_session_focus:
      "Aim to improve rep quality and control on the final working sets before pushing load.",
    recovery_observation:
      difficulty === "hard" || difficulty === "failed"
        ? "Recent effort looks high, so prioritize sleep and a lighter fatigue footprint between sessions."
        : "Recovery trend looks acceptable; keep sleep and hydration consistent.",
    exercises: updates,
  };
}
