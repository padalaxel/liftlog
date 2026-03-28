import { formatSeconds } from "@/lib/utils";

export type ExerciseSublineProps = {
  cueText?: string | null;
  progressionHint?: string | null;
  restSeconds?: number | null;
};

export function ExerciseSubline({
  cueText,
  progressionHint,
  restSeconds,
}: ExerciseSublineProps) {
  const parts = [
    cueText?.trim(),
    progressionHint?.trim(),
    typeof restSeconds === "number" ? `Rest ${formatSeconds(restSeconds)}` : null,
  ].filter(Boolean) as string[];

  if (parts.length === 0) return null;
  return (
    <div className="flex min-h-4 min-w-0 items-center gap-1.5 overflow-hidden text-[10px] leading-4 text-neutral-600">
      {parts.map((part, index) => (
        <span key={`${part}-${index}`} className="min-w-0 truncate whitespace-nowrap">
          {index > 0 ? <span className="mr-1.5 text-neutral-800">•</span> : null}
          {part}
        </span>
      ))}
    </div>
  );
}
