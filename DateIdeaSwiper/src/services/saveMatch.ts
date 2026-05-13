import { captureAppError } from "../lib/captureAppError";
import { supabase } from "../lib/supabase";

export async function saveMatch(coupleId: string, dateId: string) {
  // prevent duplicates
  const { data, error: selectError } = await supabase
    .from("matches")
    .select("*")
    .eq("couple_id", coupleId)
    .eq("date_id", dateId)
    .maybeSingle();

  if (selectError) {
    captureAppError(selectError, { op: "saveMatch_select", coupleId, dateId });
    return;
  }

  if (data) return; // already saved

  const { error: insertError } = await supabase.from("matches").insert({
    couple_id: coupleId,
    date_id: dateId,
  });
  if (insertError) captureAppError(insertError, { op: "saveMatch_insert", coupleId, dateId });
}