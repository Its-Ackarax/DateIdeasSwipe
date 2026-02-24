import { supabase } from "../lib/supabase";
import type { DateIdea } from "../types/date";

export async function getDateIdeas(): Promise<DateIdea[]> {
  const { data, error } = await supabase
    .from("dates")
    .select("id, title, category, vibe, description, image")
    .order("id");

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => {
    const rawVibes = (row as { vibe?: unknown }).vibe;
    const vibes =
      Array.isArray(rawVibes)
        ? rawVibes.map((v) => String(v).trim()).filter(Boolean)
        : typeof rawVibes === "string"
          ? rawVibes
              .split(",")
              .map((v) => v.trim())
              .filter(Boolean)
          : [];

    return {
      id: String(row.id),
      title: row.title,
      category: row.category,
      vibes,
      description: row.description,
      image: row.image,
    };
  });
}
