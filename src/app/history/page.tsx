"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BottomNav } from "@/components/workout/BottomNav";

type HistoryItem = {
  id: string;
  started_at: string;
  ai_summary_note: string | null;
  program_day_id: string;
  program_days?: { name: string } | null;
};

export default function HistoryPage() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/history");
      if (!res.ok) {
        setError("Could not load workout history yet.");
        return;
      }
      const data = await res.json();
      setItems(data.history ?? []);
    }
    load();
  }, []);

  return (
    <main className="mx-auto min-h-screen w-full max-w-md p-3 pb-20">
      <h1 className="mb-3 text-xl font-semibold">History</h1>
      {error ? <p className="mb-2 text-sm text-red-300">{error}</p> : null}
      <div className="space-y-2">
        {items.map((item) => (
          <Link key={item.id} href={`/history/${item.id}`} className="block rounded-md border border-zinc-800 bg-zinc-900 p-3">
            <p className="font-medium">{item.program_days?.name ?? "Workout"}</p>
            <p className="text-xs text-zinc-400">{new Date(item.started_at).toLocaleString()}</p>
            <p className="mt-1 text-xs text-zinc-300">
              {item.ai_summary_note ?? "No coach summary yet."}
            </p>
          </Link>
        ))}
        {!error && items.length === 0 ? (
          <p className="text-sm text-zinc-400">No workouts logged yet.</p>
        ) : null}
      </div>
      <BottomNav />
    </main>
  );
}
