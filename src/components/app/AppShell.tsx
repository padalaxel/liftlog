"use client";

import type { ReactNode } from "react";
import { BottomNav } from "@/components/workout/BottomNav";

type Props = {
  children: ReactNode;
};

export function AppShell({ children }: Props) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-zinc-950 text-zinc-100">
      <div className="flex min-h-0 flex-1 flex-col pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))]">{children}</div>
      <BottomNav />
    </div>
  );
}
