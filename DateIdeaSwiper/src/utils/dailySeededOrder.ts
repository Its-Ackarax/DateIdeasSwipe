type HasId = { id: string };

// 32-bit FNV-1a hash (fast, stable, good enough for ordering)
function fnv1a32(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/**
 * Returns a stable "random" order for `items`, unique per `seed`.
 * Use a seed like `${userId}:${YYYY-MM-DD}` to rotate daily per user.
 */
export function dailySeededOrder<T extends HasId>(items: T[], seed: string): T[] {
  return [...items].sort((a, b) => {
    const ha = fnv1a32(`${seed}:${a.id}`);
    const hb = fnv1a32(`${seed}:${b.id}`);
    return ha - hb;
  });
}

