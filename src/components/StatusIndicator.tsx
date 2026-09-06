import type { ReactNode } from "react";

/** Every color this app's status color-maps already use (taskStateColor.ts,
 * signingKeyState.ts, AdvisoriesTable's own SEVERITY_COLOR) - kept as the
 * same string union so those maps don't need to change, only the component
 * rendering them. */
export type StatusIndicatorColor = "green" | "blue" | "red" | "orange" | "yellow" | "grey";

// PatternFly's own theme-aware status tokens (VERIFIED: each is redefined
// under PatternFly's dark-theme selector, unlike AppFooter.tsx's old bug -
// see that file's own comment) - resolved live by the browser from
// whichever theme is active, not hardcoded per-theme here.
const DOT_COLOR: Record<StatusIndicatorColor, string> = {
  green: "var(--pf-t--global--color--status--success--default)",
  blue: "var(--pf-t--global--color--status--info--default)",
  red: "var(--pf-t--global--color--status--danger--default)",
  // PatternFly's token set has one semantic "warning" tier, not a separate
  // one for "orange" vs "yellow" - the label text itself still carries the
  // distinction where one exists (e.g. advisory severity's "Important" vs
  // "Moderate"), this dot is a supplementary cue, not the only signal.
  orange: "var(--pf-t--global--color--status--warning--default)",
  yellow: "var(--pf-t--global--color--status--warning--default)",
  grey: "var(--pf-t--global--icon--color--subtle)",
};

interface StatusIndicatorProps {
  color: StatusIndicatorColor;
  children: ReactNode;
  /** Matches Label's own isCompact - slightly smaller text for dense table
   * cells. */
  isCompact?: boolean;
  title?: string;
}

/**
 * A small colored dot plus plain text, replacing PatternFly's `<Label>`
 * "pill" for anything that's a genuine status (Active/Inactive, Current
 * version, task state, signing key state, advisory severity, ...) - never
 * for a removable chip or a plain category tag, which stay PatternFly
 * `<Label>`s (see the redesign's own survey of every `<Label>` call site).
 *
 * The label text renders in the page's normal foreground color, so
 * contrast is never a question the way a pastel pill's fill-vs-page-
 * background contrast was - only the small dot carries the color coding.
 */
export function StatusIndicator({ color, children, isCompact, title }: StatusIndicatorProps) {
  return (
    <span
      title={title}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.4rem",
        fontSize: isCompact ? "0.85rem" : undefined,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          display: "inline-block",
          width: 8,
          height: 8,
          minWidth: 8,
          borderRadius: "50%",
          backgroundColor: DOT_COLOR[color],
        }}
      />
      {children}
    </span>
  );
}
