"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";

type Props = {
  title: string;
  backHref: string;
  backLabel?: string;
};

export function PageHeader({ title, backHref, backLabel = "Back" }: Props) {
  return (
    <header className="sticky top-0 z-30 flex min-h-12 items-center gap-2 border-b border-zinc-800 bg-zinc-950/95 px-3 py-2 pt-[max(8px,env(safe-area-inset-top))] backdrop-blur">
      <Link
        href={backHref}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-zinc-300 active:bg-zinc-800"
        aria-label={backLabel}
      >
        <ChevronLeft className="h-6 w-6" strokeWidth={2} />
      </Link>
      <h1 className="min-w-0 flex-1 truncate text-lg font-semibold text-zinc-50">{title}</h1>
    </header>
  );
}
