import { PageSection } from "@patternfly/react-core";

import { PageHeader } from "../../components/PageHeader";
import { LoadingState } from "../../components/LoadingState";
import { ErrorState } from "../../components/ErrorState";
import { PulpStatusSummary } from "../../components/PulpStatusSummary";
import { useStatusQuery } from "../../hooks/useStatusQuery";

export function StatusPage() {
  const statusQuery = useStatusQuery();

  return (
    <>
      <PageHeader
        title="System status"
        description="Live data from Pulp's /pulp/api/v3/status/ endpoint."
      />
      <PageSection hasBodyWrapper={false}>
        {statusQuery.isPending ? <LoadingState label="Loading Pulp status" /> : null}
        {statusQuery.isError ? (
          <ErrorState error={statusQuery.error} onRetry={() => statusQuery.refetch()} />
        ) : null}
        {statusQuery.isSuccess ? <PulpStatusSummary status={statusQuery.data} /> : null}
      </PageSection>
    </>
  );
}
