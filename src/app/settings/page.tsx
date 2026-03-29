"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app/AppShell";
import { PageHeader } from "@/components/app/PageHeader";
import { clearActiveWorkoutSession } from "@/lib/active-workout-session";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function SettingsPage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [clearBusy, setClearBusy] = useState(false);
  const [clearMessage, setClearMessage] = useState<string | null>(null);

  async function signOut() {
    setBusy(true);
    try {
      const supabase = createSupabaseBrowserClient();
      await supabase.auth.signOut();
    } finally {
      setBusy(false);
    }
    router.push("/");
    router.refresh();
  }

  async function clearWorkoutHistory() {
    if (
      !window.confirm(
        "Delete all workout logs for your account? This removes every saved session from History (test and real). Your program templates are not deleted. This cannot be undone.",
      )
    ) {
      return;
    }
    setClearBusy(true);
    setClearMessage(null);
    try {
      const res = await fetch("/api/workouts/clear-history", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setClearMessage(
          typeof data?.error === "string" ? data.error : "Could not clear history. Try again.",
        );
        return;
      }
      clearActiveWorkoutSession();
      try {
        const keys = Object.keys(window.localStorage).filter((k) => k.startsWith("today-draft:"));
        keys.forEach((k) => window.localStorage.removeItem(k));
      } catch {
        // ignore
      }
      setClearMessage("All workout history cleared.");
      router.refresh();
    } finally {
      setClearBusy(false);
    }
  }

  return (
    <AppShell>
      <PageHeader title="Settings" backHref="/home" />
      <main className="flex flex-1 flex-col gap-4 p-3">
        <p className="text-sm text-zinc-400">Account and app preferences.</p>

        <section className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
          <h2 className="text-sm font-semibold text-zinc-200">Workout history</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Remove every logged session (demo tests and finished workouts). Program days and templates stay as they are.
          </p>
          <button
            type="button"
            disabled={clearBusy}
            onClick={() => void clearWorkoutHistory()}
            className="mt-3 h-10 w-full rounded-lg border border-zinc-600 bg-zinc-950 text-sm font-medium text-zinc-200 disabled:opacity-50"
          >
            {clearBusy ? "Clearing…" : "Clear all workout history"}
          </button>
          {clearMessage ? <p className="mt-2 text-xs text-zinc-400">{clearMessage}</p> : null}
        </section>

        <button
          type="button"
          disabled={busy}
          onClick={() => void signOut()}
          className="h-12 rounded-lg border border-red-900/60 bg-red-950/40 text-sm font-semibold text-red-200 disabled:opacity-50"
        >
          {busy ? "Signing out…" : "Sign out"}
        </button>
        <p className="text-xs text-zinc-500">To use a different account, sign out first, then sign in again.</p>
        <Link href="/today?demo=1" className="text-center text-sm text-zinc-500 underline">
          Open demo workout (no account)
        </Link>
      </main>
    </AppShell>
  );
}
