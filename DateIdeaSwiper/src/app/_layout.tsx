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

export default function RootLayout() {
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
      } catch {
        // ignore
      }

      await configureRevenueCat(userId);

      try {
        const info = await Purchases.getCustomerInfo();
        if (!active) return;
        setCustomerInfo(info);
        setIsPro(hasProEntitlement(info));
      } catch {
        // ignore
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const userId = session?.user?.id ?? null;
      try {
        if (userId) await logInRevenueCat(userId);
        else await logOutRevenueCat();
      } catch {
        // ignore
      }

      try {
        await analytics().setUserId(userId);
      } catch {
        // ignore
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