"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app/AppShell";
import { PageHeader } from "@/components/app/PageHeader";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function SettingsPage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

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

  return (
    <AppShell>
      <PageHeader title="Settings" backHref="/home" />
      <main className="flex flex-1 flex-col gap-4 p-3">
        <p className="text-sm text-zinc-400">Account and app preferences.</p>
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
