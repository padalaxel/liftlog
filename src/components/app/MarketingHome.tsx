import Link from "next/link";

export function MarketingHome() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-3 p-5">
      <h1 className="text-2xl font-semibold">LiftLog Coach</h1>
      <p className="text-sm text-zinc-400">Fast, Strong-like logging with AI progression updates.</p>
      <Link
        className="rounded-md bg-zinc-100 px-4 py-3 text-center text-sm font-semibold text-zinc-900"
        href="/auth"
      >
        Sign in
      </Link>
      <Link
        className="rounded-md bg-zinc-800 px-4 py-3 text-center text-sm font-semibold text-zinc-200"
        href="/today?demo=1"
      >
        Try Demo UI (no login)
      </Link>
    </div>
  );
}
