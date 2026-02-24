// src/lib/matchUtils.ts
// Timing logic and nickname generation for the daily match cycle

const DROP_HOUR = parseInt(process.env.DROP_HOUR_UTC ?? "10", 10);
const CHAT_HOURS = parseInt(process.env.CHAT_DURATION_HOURS ?? "22", 10);
const VOTE_HOURS = 24 - CHAT_HOURS; // e.g. 2 hours

/** Returns today's date string "YYYY-MM-DD" in UTC */
export function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Returns the UTC Date when today's Drop fires */
export function getTodayDropTime(): Date {
  const now = new Date();
  const drop = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), DROP_HOUR, 0, 0)
  );
  return drop;
}

/** Returns the UTC Date when today's chat phase expires (Drop + 22h) */
export function getChatExpiry(dropTime: Date): Date {
  return new Date(dropTime.getTime() + CHAT_HOURS * 60 * 60 * 1000);
}

/** Returns the UTC Date when today's vote phase expires (Drop + 24h) */
export function getVoteExpiry(dropTime: Date): Date {
  return new Date(dropTime.getTime() + 24 * 60 * 60 * 1000);
}

/**
 * Determines current app phase:
 *   - WAITING  : Before today's 10 AM drop
 *   - CHAT     : 10 AM → 8 AM next day (22h)
 *   - VOTE     : 8 AM → 10 AM next day (2h)
 */
export type AppPhase = "WAITING" | "CHAT" | "VOTE";

export function getCurrentPhase(): { phase: AppPhase; nextTransition: Date } {
  const now = new Date();
  const drop = getTodayDropTime();
  const chatExpiry = getChatExpiry(drop);
  const voteExpiry = getVoteExpiry(drop);

  if (now < drop) {
    return { phase: "WAITING", nextTransition: drop };
  }
  if (now < chatExpiry) {
    return { phase: "CHAT", nextTransition: chatExpiry };
  }
  if (now < voteExpiry) {
    return { phase: "VOTE", nextTransition: voteExpiry };
  }
  // Past vote expiry — next drop is tomorrow
  const tomorrowDrop = new Date(voteExpiry.getTime());
  return { phase: "WAITING", nextTransition: tomorrowDrop };
}

// ── Nickname Generator ────────────────────────────────────
const ADJECTIVES = [
  "Silent", "Golden", "Velvet", "Hollow", "Amber", "Neon", "Frost",
  "Crimson", "Lunar", "Obsidian", "Jade", "Azure", "Scarlet", "Ivory",
  "Shadow", "Silver", "Bronze", "Ember", "Opal", "Cobalt",
];

const NOUNS = [
  "Fox", "Raven", "Wolf", "Lynx", "Crane", "Moth", "Viper", "Hawk",
  "Otter", "Stag", "Owl", "Crow", "Bear", "Hare", "Finch", "Drake",
  "Swan", "Kite", "Mink", "Puma",
];

/** Generate a deterministic but random-feeling nickname from a seed string */
export function generateNickname(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const adjIndex = Math.abs(hash) % ADJECTIVES.length;
  const nounIndex = Math.abs(hash >> 4) % NOUNS.length;
  return `${ADJECTIVES[adjIndex]}${NOUNS[nounIndex]}`;
}
