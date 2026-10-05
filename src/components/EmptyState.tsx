import type { ComponentProps, ReactNode } from "react";
import {
  EmptyState as PfEmptyState,
  EmptyStateBody,
  EmptyStateFooter,
  EmptyStateActions,
} from "@patternfly/react-core";
import type { EmptyStateProps as PfEmptyStateProps } from "@patternfly/react-core";
import { UiIcon } from "./icons/UiIcon";

function DefaultEmptyStateIcon(props: ComponentProps<"svg">) {
  return <UiIcon {...props} name="storage" />;
}

interface EmptyStateProps {
  title: string;
  body?: ReactNode;
  action?: ReactNode;
  icon?: PfEmptyStateProps["icon"];
  /** Defaults to PatternFly's own "full" - only pass "sm" when this empty
   * state sits inside a tab/section of a bigger page, rather than being the
   * page's own full-page result (PatternFly's empty-state sizing guidance:
   * https://www.patternfly.org/components/empty-state/design-guidelines/). */
  variant?: PfEmptyStateProps["variant"];
}

export function EmptyState({
  title,
  body,
  action,
  icon = DefaultEmptyStateIcon,
  variant,
}: EmptyStateProps) {
  return (
    <PfEmptyState headingLevel="h2" icon={icon} titleText={title} variant={variant}>
      {body ? <EmptyStateBody>{body}</EmptyStateBody> : null}
      {action ? (
        <EmptyStateFooter>
          <EmptyStateActions>{action}</EmptyStateActions>
        </EmptyStateFooter>
      ) : null}
    </PfEmptyState>
  );
}
