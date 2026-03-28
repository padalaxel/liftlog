"use client";

type Props = {
  buffer: string;
  kind: "reps" | "weight";
};

export function EntryDisplay({ buffer, kind }: Props) {
  const display = buffer === "" ? "—" : buffer;

  return (
    <div className="border-b border-neutral-800 px-4 py-4 text-center">
      <div className="text-3xl font-semibold tabular-nums tracking-tight text-neutral-50">
        {display}
        {kind === "weight" ? (
          <span className="ml-2 text-xl font-medium text-neutral-400">lb</span>
        ) : null}
      </div>
      <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-neutral-500">
        {kind === "reps" ? "Reps" : "Weight"}
      </p>
    </div>
  );
}
