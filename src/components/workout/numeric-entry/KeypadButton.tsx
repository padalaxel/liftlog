"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: "default" | "primary" | "ghost";
};

export function KeypadButton({
  children,
  className = "",
  variant = "default",
  type = "button",
  ...rest
}: Props) {
  const base =
    "flex min-h-[56px] min-w-[56px] select-none items-center justify-center rounded-lg text-lg font-medium transition-colors active:scale-[0.98]";
  const styles =
    variant === "primary"
      ? "bg-blue-600 text-white hover:bg-blue-500 active:bg-blue-700"
      : variant === "ghost"
        ? "bg-neutral-800/50 text-neutral-400 hover:bg-neutral-800"
        : "bg-neutral-800 text-neutral-100 hover:bg-neutral-700 active:bg-neutral-700";

  return (
    <button type={type} className={`${base} ${styles} ${className}`} {...rest}>
      {children}
    </button>
  );
}
