import Link from "next/link";
import { AppShell } from "@/components/app/AppShell";
import { PageHeader } from "@/components/app/PageHeader";

export default function ExerciseDetailPage() {
  return (
    <AppShell>
      <PageHeader title="Exercise" backHref="/home" />
      <main className="flex flex-1 flex-col gap-3 p-3">
        <div className="space-y-2 rounded border border-zinc-800 bg-zinc-900 p-3 text-sm">
          <p>Current rule: double_progression</p>
          <p>Current cue: Control the eccentric</p>
          <p className="text-zinc-400">Recent: 135 x 8, 135 x 8, 135 x 7</p>
        </div>
        <Link href="/home" className="text-center text-sm text-zinc-400 underline">
          Back to Home
        </Link>
      </main>
    </AppShell>
  );
}
