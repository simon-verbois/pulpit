const UNITS: { unit: Intl.RelativeTimeFormatUnit; seconds: number }[] = [
  { unit: "year", seconds: 31536000 },
  { unit: "month", seconds: 2592000 },
  { unit: "day", seconds: 86400 },
  { unit: "hour", seconds: 3600 },
  { unit: "minute", seconds: 60 },
];

const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

/** "2 minutes ago", "just now", etc. Uses the native Intl API - no dependency. */
export function formatRelativeTime(isoTimestamp: string, now: Date = new Date()): string {
  const elapsedSeconds = (now.getTime() - new Date(isoTimestamp).getTime()) / 1000;

  for (const { unit, seconds } of UNITS) {
    if (Math.abs(elapsedSeconds) >= seconds) {
      return formatter.format(Math.round(-elapsedSeconds / seconds), unit);
    }
  }
  return elapsedSeconds < 5
    ? "just now"
    : formatter.format(Math.round(-elapsedSeconds), "second");
}
