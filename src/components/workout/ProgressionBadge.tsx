import { cn } from "@/lib/utils";

type Props = {
  text: string;
  tone?: "neutral" | "up" | "down";
};

export function ProgressionBadge({ text, tone = "neutral" }: Props) {
  return (
    <span
      className={cn(
        "rounded px-1.5 py-0.5 text-[10px] font-medium",
        tone === "up" && "bg-emerald-900/25 text-emerald-300",
        tone === "down" && "bg-amber-900/25 text-amber-300",
        tone === "neutral" && "bg-zinc-800/80 text-zinc-300",
      )}
    >
      {text}
    </span>
  );
}
