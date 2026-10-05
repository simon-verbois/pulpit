import { Button } from "@patternfly/react-core";
import { Table, Tbody, Td, Th, Thead, Tr } from "@patternfly/react-table";

import { LoadingState } from "../../../components/LoadingState";
import { ErrorState } from "../../../components/ErrorState";
import { EmptyState } from "../../../components/EmptyState";
import { TaskActionButton } from "../../../components/TaskActionButton";
import { RepositoryMembershipCell } from "../../../components/RepositoryMembershipCell";
import type { RepositoryKind } from "../../../api/client/repositoryMembership";
import { formatRelativeTime } from "../../../lib/relativeTime";
import type { ContainerTag } from "../../../api/client/container/types";

interface TagsTableProps {
  isPending: boolean;
  isError: boolean;
  error: unknown;
  onRetry: () => void;
  tags: ContainerTag[] | undefined;
  emptyTitle: string;
  emptyBody: string;
  /** Set by a repository-detail tab caller (nested in a bigger page) -
   * unset for the equivalent top-level list page, which stays full-page. */
  emptyStateVariant?: "sm";
  /** Present only on a repository-scoped tab (RepositoryTagsTab) - the
   * global Tags page (mirroring RPM's global Packages page) is read-only. */
  onUntag?: (tag: ContainerTag) => void;
  taskResourceHref?: string;
  repositoryKind?: RepositoryKind;
}

export function TagsTable({
  isPending,
  isError,
  error,
  onRetry,
  tags,
  emptyTitle,
  emptyBody,
  emptyStateVariant,
  onUntag,
  taskResourceHref,
  repositoryKind,
}: TagsTableProps) {
  if (isPending) {
    return <LoadingState label="Loading tags" />;
  }
  if (isError) {
    return <ErrorState error={error} onRetry={onRetry} />;
  }
  if (!tags || tags.length === 0) {
    return <EmptyState title={emptyTitle} body={emptyBody} variant={emptyStateVariant} />;
  }

  return (
    <Table aria-label="Container tags" variant="compact">
      <Thead>
        <Tr>
          <Th>Tag</Th>
          <Th>Created</Th>
          {repositoryKind ? <Th>Repositories</Th> : null}
          {onUntag ? <Th screenReaderText="Actions" /> : null}
        </Tr>
      </Thead>
      <Tbody>
        {tags.map((tag) => (
          <Tr key={tag.pulp_href}>
            <Td dataLabel="Tag">{tag.name}</Td>
            <Td dataLabel="Created">{formatRelativeTime(tag.pulp_created)}</Td>
            {repositoryKind ? (
              <Td dataLabel="Repositories">
                <RepositoryMembershipCell
                  contentHref={tag.pulp_href}
                  repositoryKind={repositoryKind}
                />
              </Td>
            ) : null}
            {onUntag ? (
              <Td dataLabel="Actions" isActionCell>
                {taskResourceHref ? (
                  <TaskActionButton
                    resourceHref={taskResourceHref}
                    taskAction={`untag:${tag.name}`}
                    variant="link"
                    isDanger
                    onClick={() => onUntag(tag)}
                  >
                    Remove
                  </TaskActionButton>
                ) : (
                  <Button variant="link" isDanger onClick={() => onUntag(tag)}>
                    Remove
                  </Button>
                )}
              </Td>
            ) : null}
          </Tr>
        ))}
      </Tbody>
    </Table>
  );
}
