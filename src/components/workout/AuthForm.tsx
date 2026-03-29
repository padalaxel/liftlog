"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function AuthForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function submit(mode: "login" | "signup") {
    setLoading(true);
    setError(null);
    let authError: { message: string } | null = null;
    try {
      const supabase = createSupabaseBrowserClient();
      const result =
        mode === "login"
          ? await supabase.auth.signInWithPassword({ email, password })
          : await supabase.auth.signUp({ email, password });
      authError = result.error;
    } catch (e) {
      setLoading(false);
      setError(
        e instanceof Error
          ? e.message
          : "Auth failed. Check Supabase URL/key in .env.local and restart dev server.",
      );
      return;
    }
    setLoading(false);
    if (authError) {
      const lower = authError.message.toLowerCase();
      if (lower.includes("email not confirmed")) {
        return setError(
          "Your email is not confirmed yet. Check inbox OR disable email confirmation in Supabase Auth settings for local testing.",
        );
      }
      return setError(authError.message);
    }
    router.push("/home");
    router.refresh();
  }

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
      <h1 className="mb-3 text-xl font-semibold">Sign in</h1>
      <input className="mb-2 h-11 w-full rounded bg-zinc-950 px-3 text-base" placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input className="mb-3 h-11 w-full rounded bg-zinc-950 px-3 text-base" placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      {error ? <p className="mb-2 text-xs text-red-300">{error}</p> : null}
      <div className="flex gap-2">
        <button disabled={loading} onClick={() => submit("login")} className="flex-1 rounded bg-zinc-100 px-3 py-2 text-sm font-semibold text-zinc-900">Sign in</button>
        <button disabled={loading} onClick={() => submit("signup")} className="flex-1 rounded bg-zinc-800 px-3 py-2 text-sm">Sign up</button>
      </div>
      <Link href="/today?demo=1" className="mt-3 block text-center text-xs text-zinc-400 underline">
        Continue in Demo Mode (no login)
      </Link>
    </div>
  );
}
