export default function ExerciseDetailPage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-md p-3">
      <h1 className="mb-3 text-xl font-semibold">Exercise Detail</h1>
      <div className="space-y-2 rounded border border-zinc-800 bg-zinc-900 p-3 text-sm">
        <p>Current rule: double_progression</p>
        <p>Current cue: Control the eccentric</p>
        <p className="text-zinc-400">Recent: 135 x 8, 135 x 8, 135 x 7</p>
      </div>
    </main>
  );
}
