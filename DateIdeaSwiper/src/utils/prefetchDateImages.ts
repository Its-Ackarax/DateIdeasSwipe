import { Image } from "expo-image";
import type { DateIdea } from "../types/date";

function collectImageUris(dates: DateIdea[]): string[] {
  return dates
    .map((d) => d.image)
    .filter((uri): uri is string => typeof uri === "string" && uri.length > 0);
}

export function prefetchDateImageUrls(uris: string[]): void {
  if (uris.length === 0) return;
  void Image.prefetch(uris, "memory-disk");
}

export function prefetchDateImages(dates: DateIdea[], count = 2): void {
  prefetchDateImageUrls(collectImageUris(dates).slice(0, count));
}

export function prefetchUpcomingFromDeck(
  cards: DateIdea[],
  fromIndex: number,
  count = 3
): void {
  const upcoming = cards.slice(fromIndex + 1, fromIndex + 1 + count);
  prefetchDateImageUrls(collectImageUris(upcoming));
}
