export function isStale(lastSyncedAt: string | null, ttlMinutes: number): boolean {
  if (!lastSyncedAt) return true;
  const ageMs = Date.now() - new Date(lastSyncedAt).getTime();
  return ageMs > ttlMinutes * 60 * 1000;
}

export const SYNC_TTL_MINUTES = {
  orders: 5,
  questions: 5,
  listings: 20,
  reputation: 20,
} as const;
