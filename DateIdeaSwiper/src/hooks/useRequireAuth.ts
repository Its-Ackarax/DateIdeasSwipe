import { router, usePathname } from "expo-router";
import { useEffect, useState } from "react";
import { isAuthRoute } from "../lib/authRedirect";
import { captureAppError } from "../lib/captureAppError";
import { supabase } from "../lib/supabase";

export function useRequireAuth() {
  const pathname = usePathname();
  const [isReady, setIsReady] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);

  useEffect(() => {
    let active = true;

    const redirectToLogin = () => {
      if (isAuthRoute(pathname)) return;

      router.replace({
        pathname: "/auth/login",
        params: { redirectTo: pathname },
      });
    };

    (async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (!active) return;

        if (error) {
          captureAppError(error, { op: "useRequireAuth_getSession" });
          redirectToLogin();
          return;
        }

        if (!data.session) {
          redirectToLogin();
          return;
        }

        setIsAuthed(true);
        setIsReady(true);
      } catch (error) {
        if (!active) return;
        captureAppError(error, { op: "useRequireAuth_getSession_catch" });
        redirectToLogin();
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;

      if (!session) {
        setIsAuthed(false);
        setIsReady(false);
        redirectToLogin();
        return;
      }

      setIsAuthed(true);
      setIsReady(true);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [pathname]);

  return { isReady, isAuthed };
}
