# notify-match Edge Function

Sends a push notification to the partner who liked first when a new row is inserted into `matches`.

## Deploy

```bash
supabase secrets set MATCH_WEBHOOK_SECRET=your-random-secret-here
supabase functions deploy notify-match --no-verify-jwt
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are provided automatically in the Supabase Edge runtime.

## Database webhook (Supabase Dashboard)

1. **Database → Webhooks → Create a new hook**
2. **Table:** `matches`
3. **Events:** `INSERT`
4. **Type:** Supabase Edge Function (or HTTP Request to the function URL)
5. **URL:** `https://<project-ref>.supabase.co/functions/v1/notify-match`
6. **HTTP Headers:** `x-webhook-secret: <same secret as MATCH_WEBHOOK_SECRET>`

## Behavior

- Finds both liked swipes for the couple + date idea
- Skips if the newest swipe is older than 2 minutes (partner-link backfill)
- Notifies the user who swiped first (the offline partner)
- Looks up the date title from `dates` for the notification body
- Prunes invalid Expo tokens when Expo returns `DeviceNotRegistered`

## Client setup

After deploying, rebuild the native app with EAS so `expo-notifications` is included, then configure APNs (iOS) and FCM (Android) credentials via `eas credentials`.
