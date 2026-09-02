import { PageSection } from "@patternfly/react-core";

import { deriveCapabilities } from "../../api/capabilities";
import { PageHeader } from "../../components/PageHeader";
import { LoadingState } from "../../components/LoadingState";
import { ErrorState } from "../../components/ErrorState";
import {
  PulpStatusSummary,
  type RepositoryCountEntry,
} from "../../components/PulpStatusSummary";
import { useStatusQuery } from "../../hooks/useStatusQuery";
import { useRepositoryCounts } from "./useRepositoryCounts";
import { useComponentSizesQuery } from "./useComponentSizesQuery";

export function OverviewPage() {
  const statusQuery = useStatusQuery();
  const capabilities = statusQuery.data
    ? deriveCapabilities(statusQuery.data)
    : undefined;
  const counts = useRepositoryCounts(capabilities);
  const componentSizesQuery = useComponentSizesQuery();

  // Keyed by status.versions[].component, so PulpStatusSummary can look
  // each row's count up directly - only plugins Pulpit has a Repositories
  // page for appear here at all (docs/UX.md).
  const repositoryCounts: Record<string, RepositoryCountEntry> = {
    ...(capabilities?.rpm
      ? { rpm: { path: "/rpm/repositories", query: counts.rpm } }
      : {}),
    ...(capabilities?.ansible
      ? { ansible: { path: "/ansible/repositories", query: counts.ansible } }
      : {}),
    ...(capabilities?.container
      ? { container: { path: "/containers/repositories", query: counts.container } }
      : {}),
  };

  return (
    <>
      <PageHeader
        title="Overview"
        description="A snapshot of the Pulp instance PulpIT is managing."
      />
      <PageSection hasBodyWrapper={false}>
        {statusQuery.isPending ? <LoadingState label="Loading Pulp status" /> : null}
        {statusQuery.isError ? (
          <ErrorState error={statusQuery.error} onRetry={() => statusQuery.refetch()} />
        ) : null}
        {statusQuery.isSuccess ? (
          <PulpStatusSummary
            status={statusQuery.data}
            repositoryCounts={repositoryCounts}
            componentSizesQuery={componentSizesQuery}
          />
        ) : null}
      </PageSection>
    </>
  );
}
