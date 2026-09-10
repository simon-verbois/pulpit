import type { ReactNode } from "react";

/** Kept as a compatibility contract for the existing status maps. Statuses
 * are deliberately rendered without semantic color: their text carries the
 * complete meaning and stays visually consistent across the application. */
export type StatusIndicatorColor =
  "green" | "blue" | "red" | "orange" | "yellow" | "grey";

interface StatusIndicatorProps {
  color: StatusIndicatorColor;
  children: ReactNode;
  /** Slightly smaller text for dense table cells. */
  isCompact?: boolean;
  title?: string;
}

/**
 * A quiet, consistently aligned text treatment for status values. There is
 * no pill, background, border, icon, or colored dot: those treatments made
 * dense tables visually noisy and did not survive remote-app rendering well.
 */
export function StatusIndicator({
  color,
  children,
  isCompact,
  title,
}: StatusIndicatorProps) {
  return (
    <span
      title={title}
      className="pulpit-status-text"
      data-status={color}
      style={{ fontSize: isCompact ? "0.875rem" : undefined }}
    >
      {children}
    </span>
  );
}
