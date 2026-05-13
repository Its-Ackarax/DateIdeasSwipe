import { captureAppError } from "../lib/captureAppError";
import { supabase } from "../lib/supabase";

export async function getCoupleId(userId: string) {
  const { data, error } = await supabase
    .from("couples")
    .select("*")
    .or(`user1.eq.${userId},user2.eq.${userId}`)
    .single();

  if (error && error.code !== "PGRST116") {
    captureAppError(error, { op: "getCoupleId", userId });
  }

  return data?.id ?? null;
}