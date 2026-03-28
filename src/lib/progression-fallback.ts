import type { AIUpdatePayload } from "@/lib/validation";

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
): AIUpdatePayload {
  const summaryParts: string[] = [];
  const exercise_adjustments: AIUpdatePayload["exercise_adjustments"] = [];

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
      exercise_adjustments.push({
        exercise_name: template.exercise_name,
        decision: "Add load",
        why: `Every completed set reached ${template.rep_max} reps at ${prevLoad} lb, and difficulty was not marked hard. Load increases only after all working sets hit the top of the ${template.rep_min}–${template.rep_max} range.`,
        next_session_target: `${targetWeight} lb × ${template.rep_max} reps on all ${targetSets} working sets`,
        focus: `Own ${targetWeight} lb with even reps across sets before chasing another jump.`,
      });
    } else if (difficulty === "hard" || difficulty === "failed" || missedFloor) {
      if (template.target_sets > 2) {
        targetSets = template.target_sets - 1;
        progressionStatus = "reduce_volume";
        progressionReason = "Reduce 1 set";
        summaryParts.push(`${template.exercise_name}: reduce fatigue`);
        exercise_adjustments.push({
          exercise_name: template.exercise_name,
          decision: "Reduce volume",
          why: `Reps fell below ${template.rep_min} on at least one set or effort was marked hard/failed. Keep load at ${targetWeight} lb until quality is consistent.`,
          next_session_target: `${targetWeight} lb × ${targetSets} sets, ${template.rep_min}–${template.rep_max} reps each`,
          focus: `Clean reps on all ${targetSets} sets before adding sets or load back.`,
        });
      } else {
        const inc = Number(template.increment_lbs || 5);
        targetWeight = Math.max(0, targetWeight - inc);
        progressionStatus = "deload";
        progressionReason = `Deload ${inc} lb`;
        summaryParts.push(`${template.exercise_name}: reduce fatigue`);
        exercise_adjustments.push({
          exercise_name: template.exercise_name,
          decision: "Deload",
          why: `Only ${template.target_sets} working sets available and quality broke down. Strip ${inc} lb to rebuild rep quality.`,
          next_session_target: `${targetWeight} lb × ${template.rep_max} reps on every set for two sessions before adding load`,
          focus: `Keep set-to-set drop-off to 1–2 reps max.`,
        });
      }
      cueText = "Control the eccentric";
    } else {
      exercise_adjustments.push({
        exercise_name: template.exercise_name,
        decision: "Hold",
        why: `Average reps ${avgReps.toFixed(1)} sit in ${template.rep_min}–${template.rep_max}, but not every set reached ${template.rep_max}. No load increase until all sets hit the top of the range.`,
        next_session_target: `${targetWeight} lb × ${template.rep_max} reps on every working set`,
        focus: `Bring the weakest set up first—match ${template.rep_max} across sets before adding weight.`,
      });
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

  const session_summary =
    summaryParts.length > 0
      ? `This session: ${summaryParts.slice(0, 3).join("; ")}. Tight execution across sets matters more than a single standout set.`
      : "Session looked steady; keep loads, tighten technique, and chase even rep rows across all working sets before loading up.";

  if (templates.length === 0) {
    return {
      session_summary:
        "No template exercises were loaded for this program day, so progression rules could not be tied to specific lifts.",
      exercise_adjustments: [
        {
          exercise_name: "Program",
          decision: "Hold",
          why: "Without template rows, the app cannot map sets to exercise names. Seed or sync your program and log every working set.",
          next_session_target: "Complete a full day with templates present",
          focus: "Log every set honestly so the next update matches reality.",
        },
      ],
      next_session_focus: [
        "Log every working set when templates are available",
        "Keep final-set reps within 1–2 of your first set",
        "Match rest before comparing set-to-set fatigue",
      ],
      recovery:
        difficulty === "hard" || difficulty === "failed"
          ? "Effort looked high relative to rep quality—prioritize sleep and food before the next heavy day."
          : "Recovery signals look workable for this volume; keep protein steady.",
      exercises: [],
    };
  }

  const next_session_focus =
    difficulty === "hard" || difficulty === "failed"
      ? [
          "Keep your final working set within 1–2 reps of your first set",
          "Slow the eccentric on last reps when bar speed drops",
          "Add one extra minute of rest before the heaviest lift if needed",
        ]
      : [
          "Keep your final working set within 1–2 reps of your first set",
          "Avoid rushing the eccentric on last reps",
          "Match rest periods so fatigue is comparable set-to-set",
        ];

  const recovery =
    difficulty === "hard" || difficulty === "failed"
      ? "Fatigue signals look elevated from this session—sleep and food matter before the next heavy day. Watch for bigger rep drop-offs on last sets next time."
      : "Recovery capacity looks adequate for this volume; keep protein and sleep steady so the next session can show clean rep rows.";

  return {
    session_summary,
    exercise_adjustments,
    next_session_focus,
    recovery,
    exercises: updates,
  };
}
