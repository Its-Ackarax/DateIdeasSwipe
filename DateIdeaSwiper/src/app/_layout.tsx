import { Stack } from "expo-router";
import { LikesProvider } from "../store/LikesContext";
import { useEffect, useMemo, useState } from "react";
import Purchases from "react-native-purchases";
import analytics from "@react-native-firebase/analytics";
import { supabase } from "../lib/supabase";
import '../../firebase.js';
import '../../analytics.js';
import { posthog } from '../../analytics';
import { ProContext } from "../store/ProContext";
import {
  configureRevenueCat,
  hasProEntitlement,
  logInRevenueCat,
  logOutRevenueCat,
} from "../lib/revenuecat";
import { captureAppError } from "../lib/captureAppError";
import * as Sentry from "@sentry/react-native";

Sentry.init({
  dsn: 'https://c44427c6d0271d552c47dcae1e696da7@o4511373612679168.ingest.de.sentry.io/4511373614448720',

  // Adds more context data to events (IP address, cookies, user, etc.)
  // For more information, visit: https://docs.sentry.io/platforms/react-native/data-management/data-collected/
  sendDefaultPii: true,

  // Enable Logs
  enableLogs: false,

  // uncomment the line below to enable Spotlight (https://spotlightjs.com)
  // spotlight: __DEV__,
});

function RootLayout() {
  const [customerInfo, setCustomerInfo] = useState<any | null>(null);
  const [isPro, setIsPro] = useState(false);

  useEffect(() => {
    posthog.capture('app_opened');
  }, []);

  useEffect(() => {
    let active = true;

    (async () => {
      const { data } = await supabase.auth.getUser();
      const userId = data.user?.id ?? null;

      try {
        await analytics().logAppOpen();
        await analytics().setUserId(userId);
      } catch (error) {
        captureAppError(error, { op: "analytics_init", phase: "app_open" });
      }

      await configureRevenueCat(userId);

      try {
        const info = await Purchases.getCustomerInfo();
        if (!active) return;
        setCustomerInfo(info);
        setIsPro(hasProEntitlement(info));
      } catch (error) {
        captureAppError(error, { op: "purchases_getCustomerInfo" });
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const userId = session?.user?.id ?? null;
      try {
        if (userId) await logInRevenueCat(userId);
        else await logOutRevenueCat();
      } catch (error) {
        captureAppError(error, { op: "purchases_auth_identity", userId });
      }

      try {
        await analytics().setUserId(userId);
      } catch (error) {
        captureAppError(error, { op: "analytics_setUserId", phase: "auth_change" });
      }
    });

    const maybeUnsubscribe = (Purchases.addCustomerInfoUpdateListener((info) => {
      if (!active) return;
      setCustomerInfo(info);
      setIsPro(hasProEntitlement(info));
    }) as unknown) as undefined | (() => void);

    return () => {
      active = false;
      sub?.subscription?.unsubscribe?.();
      maybeUnsubscribe?.();
    };
  }, []);

  const proValue = useMemo(() => ({ customerInfo, isPro }), [customerInfo, isPro]);

  return (
    <ProContext.Provider value={proValue}>
      <LikesProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </LikesProvider>
    </ProContext.Provider>
  );
}

export default Sentry.wrap(RootLayout);