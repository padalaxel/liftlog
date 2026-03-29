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
    }
    load();
  }, []);

  return (
    <AppShell>
      <main className="flex flex-1 flex-col p-3">
        <h1 className="mb-3 text-xl font-semibold">Programs</h1>
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
