import { captureAppError } from "../lib/captureAppError";
import { supabase } from "../lib/supabase";
import { saveMatch } from "./saveMatch";

export async function checkMatch(
  coupleId: string,
  dateId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("swipes")
    .select("*")
    .eq("couple_id", coupleId)
    .eq("date_id", dateId)
    .eq("liked", true);

  if (error) {
    captureAppError(error, { op: "checkMatch", coupleId, dateId });
    return false;
  }

  if (!data) return false;

  if (data.length === 2) {
    await saveMatch(coupleId, dateId);
    return true;
  }

  return false;
}