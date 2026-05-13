import * as Sentry from "@sentry/react-native";

function toError(error: unknown): Error {
  if (error instanceof Error) return error;
  if (typeof error === "string") return new Error(error);
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof (error as { message: unknown }).message === "string"
  ) {
    return new Error((error as { message: string }).message);
  }
  return new Error("Unknown error");
}

/** Send an unexpected failure to Sentry; optional extras show up on the event. */
export function captureAppError(error: unknown, context?: Record<string, unknown>): void {
  const err = toError(error);
  if (!context || Object.keys(context).length === 0) {
    Sentry.captureException(err);
    return;
  }
  Sentry.withScope((scope) => {
    for (const [key, value] of Object.entries(context)) {
      if (value !== undefined) scope.setExtra(key, value);
    }
    Sentry.captureException(err);
  });
}
