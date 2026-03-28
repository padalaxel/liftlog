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
  const exerciseBlocks: string[] = [];
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
      const inc = Number(template.increment_lbs || 5);
      const prevLoad = targetWeight;
      targetWeight += inc;
      progressionStatus = "progress";
      progressionReason = `Add ${inc} lb`;
      summaryParts.push(`${template.exercise_name}: add load`);
      exerciseBlocks.push(
        `${template.exercise_name}:\n` +
          `Increase from ${prevLoad} lb to ${targetWeight} lb next session because every completed set reached the top of your ${template.rep_min}-${template.rep_max} rep range. ` +
          `Rule: add load only after all working sets hit ${template.rep_max} reps at the current weight. ` +
          `Next session aim to match ${template.rep_max} reps across all sets at ${targetWeight} lb before chasing another jump.`,
      );
    } else if (difficulty === "hard" || difficulty === "failed" || missedFloor) {
      if (template.target_sets > 2) {
        targetSets = template.target_sets - 1;
        progressionStatus = "reduce_volume";
        progressionReason = "Reduce 1 set";
        summaryParts.push(`${template.exercise_name}: reduce fatigue`);
        exerciseBlocks.push(
          `${template.exercise_name}:\n` +
            `Hold load at ${targetWeight} lb but reduce to ${targetSets} working sets because reps dipped below ${template.rep_min} on at least one set or effort was marked hard/failed. ` +
            `Threshold: every set should stay at or above ${template.rep_min} reps before adding volume or load back. ` +
            `Next session goal: clean reps on all ${targetSets} sets, then return toward ${template.target_sets} sets before loading up.`,
        );
      } else {
        const inc = Number(template.increment_lbs || 5);
        targetWeight = Math.max(0, targetWeight - inc);
        progressionStatus = "deload";
        progressionReason = `Deload ${inc} lb`;
        summaryParts.push(`${template.exercise_name}: reduce fatigue`);
        exerciseBlocks.push(
          `${template.exercise_name}:\n` +
            `Deload to ${targetWeight} lb (${inc} lb down) to rebuild rep quality with only ${template.target_sets} working sets available. ` +
            `Milestone to progress: all sets at ${template.rep_max} reps for two sessions in a row before adding load. ` +
            `Next session focus on identical rep numbers set-to-set—no more than 1–2 rep drop from set 1 to the last set.`,
        );
      }
      cueText = "Control the eccentric";
    } else {
      exerciseBlocks.push(
        `${template.exercise_name}:\n` +
          `Hold at ${targetWeight} lb. Your average completed reps (${avgReps.toFixed(1)}) sits inside ${template.rep_min}-${template.rep_max} but not every set reached ${template.rep_max}. ` +
          `Progression rule: increase load only after all working sets hit ${template.rep_max} reps. ` +
          `Next session target: bring the weakest set up first—aim for ${template.rep_max},${template.rep_max},${template.rep_max} across sets before adding weight.`,
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
      ? `Session summary: ${summaryParts.slice(0, 3).join("; ")}. Execution consistency matters more than any single great set.`
      : "Session summary: maintain current loads, tighten technique, and chase even rep rows across all working sets before loading up.";

  const detailed_feedback =
    exerciseBlocks.length > 0
      ? exerciseBlocks.join("\n\n") +
          "\n\nProgression is driven by completed sets only—log every set honestly so the next update matches reality."
      : [
          "No template exercises were returned for this program day, so coaching cannot reference specific lifts.",
          "When templates exist, each block explains load decisions with explicit rep-range rules (typically: add load only after every working set hits the top of the programmed rep range).",
          "Next session: keep loads conservative, log every set, and aim for even rep rows across all working sets before pushing intensity.",
        ].join(" ");

  const next_session_focus =
    "• Keep your final working set within 1–2 reps of your first set\n" +
    "• Avoid rushing the eccentric on last reps\n" +
    "• Match rest periods so fatigue is comparable set-to-set";

  const recovery_observation =
    difficulty === "hard" || difficulty === "failed"
      ? "Fatigue signals look elevated from this session—sleep and food matter before the next heavy day. Watch for bigger rep drop-offs on last sets next time."
      : "Recovery capacity looks adequate for this volume; keep protein and sleep steady so the next session can show clean rep rows.";

  return {
    summary_note,
    detailed_feedback,
    next_session_focus,
    recovery_observation,
    exercises: updates,
  };
}
