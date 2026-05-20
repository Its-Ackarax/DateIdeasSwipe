import { captureAppError } from "../lib/captureAppError";
import { supabase } from "../lib/supabase";
import { getCoupleId } from "./getCoupleId";

export async function saveSwipe(
  userId: string,
  dateId: string,
  liked: boolean,
  coupleId?: string | null
) {
  const resolvedCoupleId =
    coupleId !== undefined ? coupleId : await getCoupleId(userId);

  const { error } = await supabase.from("swipes").insert({
    user_id: userId,
    couple_id: resolvedCoupleId ?? null,
    date_id: dateId,
    liked,
  });
  if (error) captureAppError(error, { op: "saveSwipe", userId, dateId, liked });
}