import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { sortActiveProgramsForClient } from "@/lib/programs-api";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data, error } = await supabase
    .from("programs")
    .select("*, program_days(*, template_exercises(*, template_sets(*)))")
    .eq("user_id", userData.user.id)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .order("order_index", { referencedTable: "program_days", ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const programs = sortActiveProgramsForClient(data);
  return NextResponse.json({ programs });
}
