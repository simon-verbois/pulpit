import type { ReactNode } from "react";
import {
  EmptyState as PfEmptyState,
  EmptyStateBody,
  EmptyStateFooter,
  EmptyStateActions,
} from "@patternfly/react-core";
import type { EmptyStateProps as PfEmptyStateProps } from "@patternfly/react-core";
import { CubesIcon } from "@patternfly/react-icons";

interface EmptyStateProps {
  title: string;
  body?: ReactNode;
  action?: ReactNode;
  icon?: PfEmptyStateProps["icon"];
}

export function EmptyState({ title, body, action, icon = CubesIcon }: EmptyStateProps) {
  return (
    <PfEmptyState headingLevel="h2" icon={icon} titleText={title}>
      {body ? <EmptyStateBody>{body}</EmptyStateBody> : null}
      {action ? (
        <EmptyStateFooter>
          <EmptyStateActions>{action}</EmptyStateActions>
        </EmptyStateFooter>
      ) : null}
    </PfEmptyState>
  );
}
