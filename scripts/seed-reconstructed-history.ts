/**
 * One-time / idempotent import of reconstructed workout history for AI coach continuity.
 *
 * Requires: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RECONSTRUCTED_HISTORY_USER_ID
 *
 * Run: npx tsx scripts/seed-reconstructed-history.ts
 *
 * Apply migration 20260329140000_workout_import_metadata.sql before running.
 */
import { readFileSync } from "fs";
import { resolve } from "path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { ReconstructedWorkoutSession } from "@/lib/seed/reconstructedHistorySessions";
import { getReconstructedSessions } from "@/lib/seed/reconstructedHistorySessions";
import { medianWeight, nextTargetFromLastSession } from "@/lib/seed/recalculateTemplateTargets";

const SOURCE = "reconstructed_history_seed";

function loadEnvLocal() {
  try {
    const p = resolve(process.cwd(), ".env.local");
    const raw = readFileSync(p, "utf8");
    for (const line of raw.split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const eq = t.indexOf("=");
      if (eq === -1) continue;
      const k = t.slice(0, eq).trim();
      let v = t.slice(eq + 1).trim();
      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      ) {
        v = v.slice(1, -1);
      }
      if (!process.env[k]) process.env[k] = v;
    }
  } catch {
    /* optional file */
  }
}

function fingerprintSession(exercises: { exerciseName: string; weight: number; reps: number[] }[]) {
  return JSON.stringify(
    exercises.map((e) => ({
      n: e.exerciseName,
      w: e.weight,
      r: e.reps,
    })),
  );
}

async function findExistingBySeedKey(
  supabase: SupabaseClient,
  userId: string,
  seedKey: string,
): Promise<string | null> {
  const fullKey = `${SOURCE}:${seedKey}`;
  const { data, error } = await supabase
    .from("workouts")
    .select("id")
    .eq("user_id", userId)
    .eq("reconstruction_seed_key", fullKey)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data?.id ?? null;
}

type SetRow = {
  actual_weight: number | null;
  actual_reps: number | null;
  set_number: number;
  template_exercises: { exercise_name: string } | { exercise_name: string }[] | null;
};

/** Same imported seed + same program day + identical exercise/weight/reps fingerprint. */
async function findEquivalentImportedWorkout(
  supabase: SupabaseClient,
  userId: string,
  programDayId: string,
  fingerprint: string,
): Promise<string | null> {
  const { data: workouts, error } = await supabase
    .from("workouts")
    .select("id")
    .eq("user_id", userId)
    .eq("program_day_id", programDayId)
    .eq("imported", true)
    .eq("source", SOURCE);
  if (error) throw new Error(error.message);
  if (!workouts?.length) return null;

  for (const w of workouts) {
    const { data: sets, error: se } = await supabase
      .from("workout_sets")
      .select(
        `
        actual_weight,
        actual_reps,
        set_number,
        template_exercises ( exercise_name )
      `,
      )
      .eq("workout_id", w.id)
      .order("set_number", { ascending: true });
    if (se) throw new Error(se.message);
    const grouped = new Map<string, { weight: number; reps: number[] }>();
    for (const row of (sets ?? []) as SetRow[]) {
      const te = row.template_exercises;
      const name = Array.isArray(te) ? te[0]?.exercise_name : te?.exercise_name;
      if (!name) continue;
      const reps = row.actual_reps ?? 0;
      const weight = Number(row.actual_weight ?? 0);
      if (!grouped.has(name)) grouped.set(name, { weight, reps: [] });
      grouped.get(name)!.reps.push(reps);
    }
    const exercises = [...grouped.entries()].map(([exerciseName, v]) => ({
      exerciseName,
      weight: v.weight,
      reps: v.reps,
    }));
    if (fingerprintSession(exercises) === fingerprint) return w.id;
  }
  return null;
}

function sessionTimestamps(sessionCount: number): string[] {
  const now = Date.now();
  const gapDays = 3;
  const msPerDay = 86400000;
  const n = sessionCount;
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    const daysBack = (n - 1 - i) * gapDays;
    out.push(new Date(now - daysBack * msPerDay).toISOString());
  }
  return out;
}

async function insertHistoricalWorkoutIfMissing(
  supabase: SupabaseClient,
  userId: string,
  programDayByName: Map<string, string>,
  templateByDayAndName: Map<string, Map<string, { id: string; rep_max: number; rep_min: number }>>,
  session: ReconstructedWorkoutSession,
  finishedAt: string,
): Promise<{ inserted: boolean; workoutId: string | null; skipReason?: string }> {
  const programDayId = programDayByName.get(session.dayName);
  if (!programDayId) {
    return { inserted: false, workoutId: null, skipReason: `unknown day ${session.dayName}` };
  }

  const fp = fingerprintSession(session.exercises);
  const fullSeedKey = `${SOURCE}:${session.seedKey}`;

  const bySeed = await findExistingBySeedKey(supabase, userId, session.seedKey);
  if (bySeed) {
    return { inserted: false, workoutId: bySeed, skipReason: "seed_key exists" };
  }

  const equiv = await findEquivalentImportedWorkout(supabase, userId, programDayId, fp);
  if (equiv) {
    return { inserted: false, workoutId: equiv, skipReason: "equivalent imported workout exists" };
  }

  const startedAt = new Date(new Date(finishedAt).getTime() - 55 * 60 * 1000).toISOString();

  const { data: workout, error: we } = await supabase
    .from("workouts")
    .insert({
      user_id: userId,
      program_day_id: programDayId,
      started_at: startedAt,
      finished_at: finishedAt,
      duration_seconds: 3300,
      difficulty: "good",
      pain_level: "none",
      imported: true,
      source: SOURCE,
      reconstruction_seed_key: fullSeedKey,
      notes: null,
      substitutions_text: null,
    })
    .select("id")
    .single();

  if (we) throw new Error(we.message);
  const workoutId = workout!.id as string;

  const dayTemplates = templateByDayAndName.get(programDayId);
  if (!dayTemplates) throw new Error(`no templates for day ${programDayId}`);

  const setRows: Record<string, unknown>[] = [];
  for (const ex of session.exercises) {
    const template = dayTemplates.get(ex.exerciseName);
    if (!template) {
      console.warn(`  skip unknown exercise "${ex.exerciseName}" on ${session.dayName}`);
      continue;
    }
    ex.reps.forEach((reps, idx) => {
      setRows.push({
        workout_id: workoutId,
        template_exercise_id: template.id,
        set_number: idx + 1,
        target_weight: ex.weight,
        actual_weight: ex.weight,
        target_reps: template.rep_max,
        actual_reps: reps,
        completed: true,
        imported: true,
        source: SOURCE,
      });
    });
  }

  if (setRows.length === 0) {
    await supabase.from("workouts").delete().eq("id", workoutId);
    return { inserted: false, workoutId: null, skipReason: "no matching templates" };
  }

  const { error: se } = await supabase.from("workout_sets").insert(setRows);
  if (se) throw new Error(se.message);

  return { inserted: true, workoutId };
}

async function recalculateTargetsAfterImport(
  supabase: SupabaseClient,
  userId: string,
  programId: string,
) {
  const { data: dayRows, error: dErr } = await supabase
    .from("program_days")
    .select("id")
    .eq("program_id", programId);
  if (dErr) throw new Error(dErr.message);
  const dayIds = dayRows?.map((d) => d.id) ?? [];
  if (dayIds.length === 0) return { updated: 0 };

  const { data: templates, error: te } = await supabase
    .from("template_exercises")
    .select("id, exercise_name, rep_min, rep_max, increment_lbs, target_weight")
    .in("program_day_id", dayIds);
  if (te) throw new Error(te.message);
  if (!templates?.length) return { updated: 0 };

  let updated = 0;
  for (const t of templates) {
    const { data: rows, error: re } = await supabase
      .from("workout_sets")
      .select(
        `
        actual_reps,
        actual_weight,
        set_number,
        workout_id,
        workouts!inner ( finished_at, user_id )
      `,
      )
      .eq("template_exercise_id", t.id)
      .eq("workouts.user_id", userId)
      .not("workouts.finished_at", "is", null);
    if (re) throw new Error(re.message);
    if (!rows?.length) continue;

    let latestWid: string | null = null;
    let latestT = 0;
    for (const r of rows) {
      const w = r.workouts as unknown;
      const wt = Array.isArray(w) ? w[0] : w;
      const finishedAt =
        wt && typeof wt === "object" && "finished_at" in wt
          ? String((wt as { finished_at: string }).finished_at)
          : null;
      if (!finishedAt) continue;
      const ft = new Date(finishedAt).getTime();
      if (ft >= latestT) {
        latestT = ft;
        latestWid = (r as { workout_id: string }).workout_id;
      }
    }
    if (!latestWid) continue;

    const latestRows = rows
      .filter((r) => (r as { workout_id: string }).workout_id === latestWid)
      .sort((a, b) => (a as { set_number: number }).set_number - (b as { set_number: number }).set_number);
    const reps = latestRows.map((r) => (r as { actual_reps: number | null }).actual_reps ?? 0);
    const weights = latestRows.map((r) =>
      Number((r as { actual_weight: unknown }).actual_weight ?? 0),
    );

    const nextW = nextTargetFromLastSession({
      reps,
      weights,
      repMax: t.rep_max,
      incrementLbs: Number(t.increment_lbs) || 5,
    });

    const prevMedian = medianWeight(weights);
    if (prevMedian == null) continue;
    if (Math.abs(Number(t.target_weight) - nextW) < 0.001) continue;

    const { error: ue } = await supabase
      .from("template_exercises")
      .update({ target_weight: nextW, updated_at: new Date().toISOString() })
      .eq("id", t.id);
    if (ue) throw new Error(ue.message);
    updated += 1;
  }

  return { updated };
}

async function main() {
  loadEnvLocal();
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const userId = process.env.RECONSTRUCTED_HISTORY_USER_ID;

  if (!url || !key || !userId) {
    console.error(
      "Set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and RECONSTRUCTED_HISTORY_USER_ID (auth user uuid).",
    );
    process.exit(1);
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const { data: programs, error: pe } = await supabase
    .from("programs")
    .select("id")
    .eq("user_id", userId)
    .eq("name", "Hypertrophy")
    .limit(1);
  if (pe) throw new Error(pe.message);
  const program = programs?.[0];
  if (!program) {
    console.error("No Hypertrophy program for user. Run supabase seed or create program first.");
    process.exit(1);
  }

  const { data: days, error: de } = await supabase
    .from("program_days")
    .select("id, name, order_index")
    .eq("program_id", program.id)
    .order("order_index", { ascending: true });
  if (de) throw new Error(de.message);

  const programDayByName = new Map(days?.map((d) => [d.name, d.id]) ?? []);
  const templateByDayAndName = new Map<
    string,
    Map<string, { id: string; rep_max: number; rep_min: number }>
  >();

  for (const d of days ?? []) {
    const { data: te, error } = await supabase
      .from("template_exercises")
      .select("id, exercise_name, rep_min, rep_max")
      .eq("program_day_id", d.id);
    if (error) throw new Error(error.message);
    const m = new Map<string, { id: string; rep_max: number; rep_min: number }>();
    for (const row of te ?? []) {
      m.set(row.exercise_name, {
        id: row.id,
        rep_max: row.rep_max,
        rep_min: row.rep_min,
      });
    }
    templateByDayAndName.set(d.id, m);
  }

  const sessions = getReconstructedSessions();
  const timestamps = sessionTimestamps(sessions.length);
  let inserted = 0;
  let skipped = 0;
  const insertedIds: string[] = [];

  for (let i = 0; i < sessions.length; i++) {
    const session = sessions[i];
    const ts = timestamps[i]!;
    const r = await insertHistoricalWorkoutIfMissing(
      supabase,
      userId,
      programDayByName,
      templateByDayAndName,
      session,
      ts,
    );
    if (r.inserted && r.workoutId) {
      inserted += 1;
      insertedIds.push(r.workoutId);
      console.log(`inserted ${session.seedKey} (${session.dayName}) @ ${ts}`);
    } else {
      skipped += 1;
      console.log(`skip ${session.seedKey}: ${r.skipReason ?? "unknown"}`);
    }
  }

  const recalc = await recalculateTargetsAfterImport(supabase, userId, program.id);
  console.log(`\nTemplate targets updated: ${recalc.updated}`);
  console.log(`Inserted workouts: ${inserted}, skipped: ${skipped}`);
  if (insertedIds.length) console.log("Workout ids:", insertedIds.join(", "));
  console.log(
    "\nCoach: buildCoachContext reads completed workouts (finished_at set, including imported). They are not scheduled sessions—Today starts a fresh workout from program templates only.",
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
