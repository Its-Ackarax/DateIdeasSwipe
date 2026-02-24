import { supabase } from "../lib/supabase";

export async function getCoupleId(userId: string) {
  const { data } = await supabase
    .from("couples")
    .select("*")
    .or(`user1.eq.${userId},user2.eq.${userId}`)
    .single();

  return data?.id ?? null;
}