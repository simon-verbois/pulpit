/** Login can return only to a rooted route in this app. */
export function loginDestination(next: string | null): string {
  if (!next?.startsWith("/") || next.startsWith("//")) return "/";
  try {
    const decoded = decodeURIComponent(next);
    if (
      /^[\s]*\/\//.test(decoded) ||
      decoded.includes("\\") ||
      Array.from(decoded).some(
        (char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127,
      )
    )
      return "/";
    const target = new URL(next, "https://pulpit.invalid");
    if (target.origin !== "https://pulpit.invalid" || target.pathname === "/login")
      return "/";
    return `${target.pathname}${target.search}${target.hash}`;
  } catch {
    return "/";
  }
}
