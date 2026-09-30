/** Elapsed time between two ISO timestamps (`end` defaults to now, for a
 * task still running), as "850 ms", "42 s", "3 min 05 s" or "1 h 02 min". */
export function formatDuration(start: string, end?: string): string {
  const ms = Math.max(0, (end ? Date.parse(end) : Date.now()) - Date.parse(start));
  if (Number.isNaN(ms)) return "—";
  if (ms < 1000) return `${ms} ms`;
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds} s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ${String(seconds % 60).padStart(2, "0")} s`;
  return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, "0")} min`;
}
