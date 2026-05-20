export const CATEGORY_ORDER = [
  "Cheap & Cheerful",
  "Day In",
  "Day Out",
  "Night In",
  "Night Out",
  "Luxury",
  "Other",
] as const;

export type CategoryVisual = {
  emoji: string;
  accent: string;
  badgeBg: string;
  badgeText: string;
};

export const MATCH_CATEGORY_VISUALS: Record<string, CategoryVisual> = {
  "Cheap & Cheerful": {
    emoji: "💸",
    accent: "#f97316",
    badgeBg: "#ffedd5",
    badgeText: "#9a3412",
  },
  "Day In": {
    emoji: "🏡",
    accent: "#38bdf8",
    badgeBg: "#e0f2fe",
    badgeText: "#075985",
  },
  "Day Out": {
    emoji: "🌤️",
    accent: "#22c55e",
    badgeBg: "#dcfce7",
    badgeText: "#166534",
  },
  "Night In": {
    emoji: "🕯️",
    accent: "#a78bfa",
    badgeBg: "#ede9fe",
    badgeText: "#5b21b6",
  },
  "Night Out": {
    emoji: "🌙",
    accent: "#0ea5e9",
    badgeBg: "#e0f2fe",
    badgeText: "#0c4a6e",
  },
  Luxury: {
    emoji: "✨",
    accent: "#f59e0b",
    badgeBg: "#fef3c7",
    badgeText: "#92400e",
  },
  Other: {
    emoji: "📁",
    accent: "#94a3b8",
    badgeBg: "#f1f5f9",
    badgeText: "#0f172a",
  },
};

export function getCategoryVisual(category: string): CategoryVisual {
  return (
    MATCH_CATEGORY_VISUALS[category] ?? {
      emoji: "📁",
      accent: "#94a3b8",
      badgeBg: "#f1f5f9",
      badgeText: "#0f172a",
    }
  );
}

export function categorySortIndex(category: string): number {
  const index = CATEGORY_ORDER.indexOf(category as (typeof CATEGORY_ORDER)[number]);
  return index === -1 ? CATEGORY_ORDER.length : index;
}
