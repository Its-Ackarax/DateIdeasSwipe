export function isAuthRoute(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/onboarding")
  );
}

export function getPostLoginRedirect(redirectTo: unknown): string {
  const path = Array.isArray(redirectTo) ? redirectTo[0] : redirectTo;
  if (typeof path !== "string" || !path.startsWith("/") || isAuthRoute(path)) {
    return "/(tabs)";
  }
  return path;
}
