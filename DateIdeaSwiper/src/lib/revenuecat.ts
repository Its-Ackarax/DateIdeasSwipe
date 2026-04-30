import Purchases, { LOG_LEVEL } from "react-native-purchases";

export const REVENUECAT_API_KEY = "test_ZksFaVGSREQzpAydcyDqQaGYQiO";
export const PRO_ENTITLEMENT_ID = "DateSwiper Pro";

let configured = false;

export async function configureRevenueCat(appUserId?: string | null) {
  if (configured) return;

  Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.DEBUG : LOG_LEVEL.INFO);

  Purchases.configure({
    apiKey: REVENUECAT_API_KEY,
    appUserID: appUserId ?? undefined,
  });

  configured = true;
}

export async function logInRevenueCat(appUserId: string) {
  await Purchases.logIn(appUserId);
}

export async function logOutRevenueCat() {
  await Purchases.logOut();
}

export function hasProEntitlement(customerInfo: any): boolean {
  const entitlements = customerInfo?.entitlements?.active;
  return Boolean(entitlements?.[PRO_ENTITLEMENT_ID]);
}

