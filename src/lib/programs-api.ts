/**
 * When multiple rows are `is_active`, prefer the program that actually has the full split
 * (most `program_days`), then the Hypertrophy template by name, then newest.
 */
export function sortActiveProgramsForClient<
  T extends { name?: string | null; created_at?: string; program_days?: unknown },
>(programs: T[] | null | undefined): T[] {
  const list = [...(programs ?? [])];
  list.sort((a, b) => {
    const la = Array.isArray(a.program_days) ? a.program_days.length : 0;
    const lb = Array.isArray(b.program_days) ? b.program_days.length : 0;
    if (lb !== la) return lb - la;
    const ah = (a.name ?? "").trim().toLowerCase() === "hypertrophy" ? 1 : 0;
    const bh = (b.name ?? "").trim().toLowerCase() === "hypertrophy" ? 1 : 0;
    if (bh !== ah) return bh - ah;
    const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
    const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
    return tb - ta;
  });
  return list;
}
