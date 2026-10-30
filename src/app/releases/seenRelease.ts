const memory = new Map<string, string>();

function storageKey(userId: string) {
  return `pulpit:last-seen-release:${userId}`;
}

function cookieKey(userId: string) {
  return `pulpit_release_seen_${encodeURIComponent(userId)}`;
}

function readSeenRelease(userId: string): string | undefined {
  const candidates: string[] = [];
  try {
    const stored = localStorage.getItem(storageKey(userId));
    if (stored) candidates.push(stored);
  } catch {
    // Some gateways/browser policies block Web Storage while cookies work.
  }
  try {
    const prefix = `${cookieKey(userId)}=`;
    for (const cookie of document.cookie.split(";")) {
      const value = cookie.trim();
      if (value.startsWith(prefix))
        candidates.push(decodeURIComponent(value.slice(prefix.length)));
    }
  } catch {
    // Retain the acknowledgement in memory if both persistence APIs fail.
  }
  const cached = memory.get(userId);
  if (cached) candidates.push(cached);
  // A gateway can expose an older/read-only storage snapshot. Never let it
  // override a newer acknowledgement in another store.
  return candidates.reduce<string | undefined>((latest, version) => {
    if (!/^\d{4}\.\d{1,2}\.\d+$/.test(version)) return latest;
    return !latest || isNewer(version, latest) ? version : latest;
  }, undefined);
}

export function hasNewRelease(
  userId: string,
  currentVersion: string,
  legacyUserId?: string,
): boolean {
  const seen =
    readSeenRelease(userId) ?? (legacyUserId ? readSeenRelease(legacyUserId) : undefined);
  if (!seen || !/^\d{4}\.\d{1,2}\.\d+$/.test(seen)) return true;
  return isNewer(currentVersion, seen);
}

function isNewer(currentVersion: string, seen: string): boolean {
  const previous = seen.split(".").map(Number);
  const current = currentVersion.split(".").map(Number);
  for (let index = 0; index < current.length; index++) {
    if (current[index] !== previous[index]) return current[index] > previous[index];
  }
  return false;
}

/** UI preference only: no session token, password or authorization data. */
export function rememberRelease(
  userId: string,
  version: string,
  legacyUserId?: string,
): void {
  const previous =
    readSeenRelease(userId) ?? (legacyUserId ? readSeenRelease(legacyUserId) : undefined);
  if (previous && /^\d{4}\.\d{1,2}\.\d+$/.test(previous) && !isNewer(version, previous)) {
    version = previous;
  }
  memory.set(userId, version);
  try {
    localStorage.setItem(storageKey(userId), version);
  } catch {
    /* The cookie is an independent persistence fallback. */
  }
  try {
    const secure = location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${cookieKey(userId)}=${encodeURIComponent(version)}; Path=/; Max-Age=34560000; SameSite=Lax${secure}`;
  } catch {
    /* Memory still prevents repeats within this app session. */
  }
}
