"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/home", label: "Home" },
  { href: "/programs", label: "Programs" },
  { href: "/history", label: "History" },
  { href: "/settings", label: "Settings" },
] as const;

function navActive(pathname: string, href: string) {
  if (href === "/home") return pathname === "/home";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-1/2 z-40 w-full max-w-[430px] -translate-x-1/2 border-t border-neutral-800 bg-neutral-950/95 px-2 pt-2 pb-[max(8px,env(safe-area-inset-bottom))] backdrop-blur">
      <div className="grid h-14 grid-cols-4 items-center">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center gap-1 text-[10px] ${navActive(pathname, item.href) ? "text-neutral-50" : "text-neutral-500"}`}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
