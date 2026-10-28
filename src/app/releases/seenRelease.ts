function storageKey(userId: string) {
  return `pulpit:last-seen-release:${userId}`;
}

export function hasNewRelease(userId: string, currentVersion: string): boolean {
  let seen: string | null;
  try {
    seen = localStorage.getItem(storageKey(userId));
  } catch {
    return true;
  }
  if (!seen || !/^\d{4}\.\d{1,2}\.\d+$/.test(seen)) {
    return true;
  }
  const previous = seen.split(".").map(Number);
  const current = currentVersion.split(".").map(Number);
  for (let index = 0; index < current.length; index++) {
    if (current[index] !== previous[index]) {
      return current[index] > previous[index];
    }
  }
  return false;
}

export function rememberRelease(userId: string, version: string): void {
  try {
    localStorage.setItem(storageKey(userId), version);
  } catch {
    // Storage may be disabled. Dismissing still works for this app session.
  }
}
