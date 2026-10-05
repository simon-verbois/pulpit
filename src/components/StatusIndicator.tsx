import type { ReactNode } from "react";
import { Label } from "@patternfly/react-core";

export type StatusIndicatorColor =
  "green" | "blue" | "red" | "orange" | "yellow" | "grey";

interface StatusIndicatorProps {
  color: StatusIndicatorColor;
  children: ReactNode;
  /** Slightly smaller treatment for dense table cells. */
  isCompact?: boolean;
  title?: string;
}

export function StatusIndicator({
  color,
  children,
  isCompact,
  title,
}: StatusIndicatorProps) {
  return (
    <Label color={color} isCompact={isCompact} title={title} data-status={color}>
      {children}
    </Label>
  );
}
