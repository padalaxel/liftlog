import { redirect } from "next/navigation";
import { MarketingHome } from "@/components/app/MarketingHome";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    redirect("/home");
  }
  return <MarketingHome />;
}
