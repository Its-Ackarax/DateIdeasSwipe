import { createClient } from "https://esm.sh/@supabase/supabase-js@2.97.0";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const RECENCY_WINDOW_MS = 2 * 60 * 1000;

type MatchRecord = {
  couple_id: string;
  date_id: string | number;
};

type SwipeRow = {
  user_id: string;
  created_at: string;
};

type WebhookPayload = {
  type?: string;
  table?: string;
  record?: MatchRecord;
};

type ExpoPushTicket = {
  status: "ok" | "error";
  id?: string;
  message?: string;
  details?: { error?: string };
};

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const webhookSecret = Deno.env.get("MATCH_WEBHOOK_SECRET");
  const providedSecret = req.headers.get("x-webhook-secret");

  if (!webhookSecret || providedSecret !== webhookSecret) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Missing Supabase env vars");
    return new Response("Server misconfigured", { status: 500 });
  }

  let payload: WebhookPayload;
  try {
    payload = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  if (payload.type !== "INSERT" || payload.table !== "matches" || !payload.record) {
    return new Response(JSON.stringify({ skipped: true, reason: "not_a_match_insert" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { couple_id: coupleId, date_id: dateId } = payload.record;
  if (!coupleId || dateId == null) {
    return new Response(JSON.stringify({ skipped: true, reason: "missing_fields" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { data: swipes, error: swipesError } = await supabase
    .from("swipes")
    .select("user_id, created_at")
    .eq("couple_id", coupleId)
    .eq("date_id", dateId)
    .eq("liked", true)
    .order("created_at", { ascending: true });

  if (swipesError) {
    console.error("swipes lookup failed", swipesError);
    return new Response("Swipe lookup failed", { status: 500 });
  }

  const likedSwipes = (swipes ?? []) as SwipeRow[];
  if (likedSwipes.length < 2) {
    return new Response(JSON.stringify({ skipped: true, reason: "not_enough_swipes" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const newestSwipe = likedSwipes[likedSwipes.length - 1];
  const newestAt = new Date(newestSwipe.created_at).getTime();
  if (Number.isNaN(newestAt) || Date.now() - newestAt > RECENCY_WINDOW_MS) {
    return new Response(JSON.stringify({ skipped: true, reason: "stale_match_backfill" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const recipientUserId = likedSwipes[0].user_id;

  const { data: tokens, error: tokensError } = await supabase
    .from("push_tokens")
    .select("expo_push_token")
    .eq("user_id", recipientUserId);

  if (tokensError) {
    console.error("token lookup failed", tokensError);
    return new Response("Token lookup failed", { status: 500 });
  }

  const pushTokens = (tokens ?? [])
    .map((row) => row.expo_push_token as string)
    .filter(Boolean);

  if (pushTokens.length === 0) {
    return new Response(JSON.stringify({ skipped: true, reason: "no_push_tokens" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { data: dateRow } = await supabase
    .from("dates")
    .select("title")
    .eq("id", dateId)
    .maybeSingle();

  const dateTitle = (dateRow?.title as string | undefined)?.trim() || "a new date idea";
  const body = `You both liked: ${dateTitle}`;

  const messages = pushTokens.map((token) => ({
    to: token,
    sound: "default" as const,
    title: "It's a match!",
    body,
    data: {
      screen: "matches",
      dateId: String(dateId),
    },
  }));

  const expoResponse = await fetch(EXPO_PUSH_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Accept-Encoding": "gzip, deflate",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(messages),
  });

  if (!expoResponse.ok) {
    const text = await expoResponse.text();
    console.error("Expo push failed", expoResponse.status, text);
    return new Response("Expo push failed", { status: 502 });
  }

  const tickets = (await expoResponse.json()) as { data?: ExpoPushTicket[] };
  const invalidTokens: string[] = [];

  for (let i = 0; i < (tickets.data?.length ?? 0); i++) {
    const ticket = tickets.data![i];
    if (
      ticket.status === "error" &&
      ticket.details?.error === "DeviceNotRegistered"
    ) {
      invalidTokens.push(pushTokens[i]);
    }
  }

  if (invalidTokens.length > 0) {
    await supabase
      .from("push_tokens")
      .delete()
      .eq("user_id", recipientUserId)
      .in("expo_push_token", invalidTokens);
  }

  return new Response(
    JSON.stringify({
      sent: pushTokens.length,
      recipientUserId,
      prunedTokens: invalidTokens.length,
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );
});
