import { supabase } from "../lib/supabase";

export async function saveMatch(coupleId: string, dateId: string) {
  // prevent duplicates
  const { data } = await supabase
    .from("matches")
    .select("*")
    .eq("couple_id", coupleId)
    .eq("date_id", dateId)
    .maybeSingle();

  if (data) return; // already saved

  await supabase.from("matches").insert({
    couple_id: coupleId,
    date_id: dateId,
  });
}