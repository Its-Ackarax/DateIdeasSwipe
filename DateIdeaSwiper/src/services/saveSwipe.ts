import { supabase } from "../lib/supabase";
import { getCoupleId } from "./getCoupleId";

export async function saveSwipe(userId: string, dateId: string, liked: boolean) {
  const coupleId = await getCoupleId(userId);

  await supabase.from("swipes").insert({
    user_id: userId,
    couple_id: coupleId ?? null,
    date_id: dateId,
    liked,
  });
}