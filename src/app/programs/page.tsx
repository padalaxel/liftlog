"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app/AppShell";
import { MOCK_PROGRAM_DAYS } from "@/lib/mock-data";

type Day = { id: string; name: string; order_index: number };

export default function ProgramsPage() {
  const [days, setDays] = useState<Day[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/programs");
      if (!res.ok) {
        setDays(
          MOCK_PROGRAM_DAYS.map((d) => ({
            id: d.id,
            name: d.name,
            order_index: d.order_index,
          })),
        );
        setError("Demo mode: sign in to load your real program.");
        return;
      }
      const data = await res.json();
      const loaded = (data?.programs?.[0]?.program_days ?? []) as Day[];
      setDays(loaded.slice().sort((a, b) => a.order_index - b.order_index));
      setError(null);
    }
    load();
  }, []);

  return (
    <AppShell>
      <main className="flex flex-1 flex-col p-3">
        <h1 className="mb-3 text-xl font-semibold">Programs</h1>
        {days.length === 1 && !error ? (
          <div className="mb-3 rounded-lg border border-amber-800/50 bg-amber-950/35 px-3 py-2.5 text-sm text-amber-100/95">
            <p className="font-medium text-amber-50">Only one training day on your account</p>
            <p className="mt-1 text-xs leading-relaxed text-amber-200/90">
              The app loads your active program from Supabase. An older seed may have created just UPPER A, or a
              second program may be active. Prefer the program with all four days: run{" "}
              <code className="rounded bg-zinc-950/60 px-1 text-[11px]">supabase/seed.sql</code> in the Supabase SQL
              editor using your auth user id, or add LOWER A / UPPER B / LOWER B in the Table Editor. Turn off{" "}
              <code className="rounded bg-zinc-950/60 px-1 text-[11px]">is_active</code> on any extra programs so only
              the full Hypertrophy program stays active.
            </p>
          </div>
        ) : null}
        {error ? <p className="mb-2 text-sm text-red-300">{error}</p> : null}
        <div className="space-y-2">
          {days.map((day) => (
            <Link
              key={day.id}
              href={`/programs/${day.id}`}
              className="block rounded-lg border border-zinc-800 bg-zinc-900 p-3 font-medium text-zinc-100"
            >
              {day.name}
            </Link>
          ))}
        </div>
      </main>
    </AppShell>
  );
}
