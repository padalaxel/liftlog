"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app/AppShell";
import { MOCK_PROGRAM_DAYS } from "@/lib/mock-data";
import { pickLatestFinishedWorkout, pickSuggestedProgramDay } from "@/lib/next-suggested-program-day";
import { readActiveWorkoutSession } from "@/lib/active-workout-session";

type Day = { id: string; name: string; order_index: number };

type HistoryItem = {
  id: string;
  started_at: string;
  program_day_id: string;
  finished_at: string | null;
  program_days?: { name: string } | null;
  ai_summary_note?: string | null;
};

export default function HomeDashboardPage() {
  const [days, setDays] = useState<Day[]>([]);
  const [suggested, setSuggested] = useState<Day | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [demoMode, setDemoMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(() => readActiveWorkoutSession());

  useEffect(() => {
    setActive(readActiveWorkoutSession());
  }, []);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const res = await fetch("/api/programs");
      if (!res.ok) {
        const sorted = MOCK_PROGRAM_DAYS.map((d) => ({
          id: d.id,
          name: d.name,
          order_index: d.order_index,
        })).sort((a, b) => a.order_index - b.order_index);
        setDays(sorted);
        setSuggested(pickSuggestedProgramDay(sorted, null));
        setDemoMode(true);
        setHistory([]);
        setLoading(false);
        return;
      }
      const data = await res.json();
      const loaded = (data?.programs?.[0]?.program_days ?? []) as Day[];
      const sorted = loaded.slice().sort((a, b) => a.order_index - b.order_index);
      setDays(sorted);
      setDemoMode(false);

      const historyRes = await fetch("/api/history");
      let hist: HistoryItem[] = [];
      if (historyRes.ok) {
        const h = await historyRes.json();
        hist = (h.history ?? []) as HistoryItem[];
        setHistory(hist);
        const last = pickLatestFinishedWorkout(
          hist.map((w) => ({ program_day_id: w.program_day_id, finished_at: w.finished_at })),
        );
        setSuggested(pickSuggestedProgramDay(sorted, last));
      } else {
        setSuggested(sorted[0] ?? null);
        setHistory([]);
      }
      setLoading(false);
    }
    void load();
  }, []);

  const recent = useMemo(() => history.slice(0, 4), [history]);

  function todayHref(dayId: string | null, isDemo: boolean) {
    const params = new URLSearchParams();
    if (dayId) params.set("dayId", dayId);
    if (isDemo) params.set("demo", "1");
    const q = params.toString();
    return q ? `/today?${q}` : "/today";
  }

  const continueHref =
    active && days.some((d) => d.id === active.programDayId)
      ? todayHref(active.programDayId, Boolean(active.isDemo))
      : null;

  const startSuggestedHref = suggested ? todayHref(suggested.id, demoMode) : "/today";

  return (
    <AppShell>
      <main className="flex flex-1 flex-col gap-4 p-3">
        <div>
          <h1 className="text-xl font-semibold text-zinc-50">Home</h1>
          <p className="mt-1 text-sm text-zinc-400">
            {demoMode ? "Demo mode — sign in to sync your program and history." : "Your training dashboard."}
          </p>
        </div>

        {!loading && !demoMode && days.length === 1 ? (
          <div className="rounded-lg border border-amber-800/50 bg-amber-950/35 px-3 py-2.5 text-xs leading-relaxed text-amber-200/90">
            <span className="font-medium text-amber-50">Program note: </span>
            Only one day is linked to your account (see Programs for how to load the full four-day template in
            Supabase).
          </div>
        ) : null}

        {loading ? <p className="text-sm text-zinc-500">Loading…</p> : null}

        {!loading && suggested ? (
          <section className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Next up</p>
            <p className="mt-1 text-lg font-semibold text-zinc-50">{suggested.name}</p>
            <div className="mt-3 flex flex-col gap-2">
              <Link
                href={startSuggestedHref}
                className="flex h-12 items-center justify-center rounded-full bg-zinc-100 text-sm font-semibold text-zinc-900 active:scale-[0.99]"
              >
                Start workout
              </Link>
              {continueHref ? (
                <Link
                  href={continueHref}
                  className="flex h-11 items-center justify-center rounded-full border border-zinc-600 text-sm font-medium text-zinc-200"
                >
                  Continue workout
                  {active?.programDayName ? ` — ${active.programDayName}` : ""}
                </Link>
              ) : null}
            </div>
          </section>
        ) : null}

        <section>
          <h2 className="mb-2 text-sm font-semibold text-zinc-300">All workout days</h2>
          <div className="space-y-2">
            {days.map((d) => (
              <Link
                key={d.id}
                href={`/programs/${d.id}`}
                className="block rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-3 text-sm font-medium text-zinc-100 active:bg-zinc-800/80"
              >
                {d.name}
              </Link>
            ))}
          </div>
        </section>

        {!demoMode ? (
          <section>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-300">Recent sessions</h2>
              <Link href="/history" className="text-xs text-zinc-500">
                See all
              </Link>
            </div>
            {recent.length === 0 ? (
              <p className="text-sm text-zinc-500">No completed workouts yet.</p>
            ) : (
              <div className="space-y-2">
                {recent.map((item) => (
                  <Link
                    key={item.id}
                    href={`/history/${item.id}`}
                    className="block rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2.5"
                  >
                    <p className="text-sm font-medium text-zinc-100">
                      {item.program_days?.name ?? "Workout"}
                    </p>
                    <p className="text-xs text-zinc-500">{new Date(item.started_at).toLocaleString()}</p>
                  </Link>
                ))}
              </div>
            )}
          </section>
        ) : null}
      </main>
    </AppShell>
  );
}
