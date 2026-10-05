import { Grid, GridItem, PageSection, Stack, StackItem } from "@patternfly/react-core";

import { deriveCapabilities } from "../../api/capabilities";
import { OverviewWarnings } from "../../components/OverviewWarnings";
import { PageHeader } from "../../components/PageHeader";
import { LoadingState } from "../../components/LoadingState";
import { ErrorState } from "../../components/ErrorState";
import { PulpStatusSummary } from "../../components/PulpStatusSummary";
import { useStatusQuery } from "../../hooks/useStatusQuery";
import { useNavVisibilityQuery } from "../../hooks/useNavVisibilityQuery";
import { RecentTasksCard } from "./RecentTasksCard";
import { useRepositoryCounts } from "./useRepositoryCounts";
import { useComponentSizesQuery } from "./useComponentSizesQuery";
import { useApiCompatibilityWarning } from "./useApiCompatibilityWarning";
import { useTlsCertWarning } from "./useTlsCertWarning";

export function OverviewPage() {
  const statusQuery = useStatusQuery();
  const navVisibilityQuery = useNavVisibilityQuery();
  const capabilities = statusQuery.data
    ? deriveCapabilities(statusQuery.data)
    : undefined;
  const repositoryCountsQuery = useRepositoryCounts();
  const componentSizesQuery = useComponentSizesQuery();
  const tlsCertWarning = useTlsCertWarning();
  const apiCompatibilityWarning = useApiCompatibilityWarning();

  // Keyed by status.versions[].component, so PulpStatusSummary can look
  // each row's path up directly - only plugins Pulpit has a Repositories
  // page for appear here at all (docs/UX.md). Mirrors NAV_TREE's own path
  // for each plugin's Repositories page (navTree.ts).
  const REPOSITORY_PATHS: Record<string, string> = {
    rpm: "/rpm/repositories",
    deb: "/deb/repositories",
    container: "/containers/repositories",
    ansible: "/ansible/repositories",
    file: "/files/repositories",
    hugging_face: "/hugging-face/repositories",
    gem: "/gems/repositories",
    maven: "/maven/repositories",
    npm: "/npm/repositories",
    python: "/python/repositories",
  };
  const repositoryPaths: Record<string, string> = Object.fromEntries(
    Object.entries(REPOSITORY_PATHS).filter(
      ([component]) => capabilities?.[component as keyof typeof capabilities],
    ),
  );

  // Keep showing the loading state until nav-visibility has also settled
  // (success or error - `isLoading` only covers its own first, in-flight
  // fetch), not just status - otherwise the component table below briefly
  // renders every plugin (PulpStatusSummary fails open the same way AppNav
  // does while visibleModuleIds hasn't loaded yet) and then a moment later
  // loses whichever ones nav-visibility actually restricts, on every single
  // page load.
  const isInitialLoad =
    statusQuery.isPending || (!statusQuery.isError && navVisibilityQuery.isLoading);

  return (
    <>
      <PageHeader
        title="Overview"
        description="A snapshot of the Pulp instance PulpIT is managing."
        className="pulpit-overview-header"
      />
      <PageSection hasBodyWrapper={false} className="pulpit-overview-content">
        {isInitialLoad ? <LoadingState label="Loading Pulp status" /> : null}
        {statusQuery.isError ? (
          <ErrorState error={statusQuery.error} onRetry={() => statusQuery.refetch()} />
        ) : null}
        {statusQuery.isSuccess && !navVisibilityQuery.isLoading ? (
          <Stack hasGutter>
            <StackItem>
              <PulpStatusSummary
                status={statusQuery.data}
                repositoryCountsQuery={repositoryCountsQuery}
                repositoryPaths={repositoryPaths}
                componentSizesQuery={componentSizesQuery}
                visibleModuleIds={navVisibilityQuery.data?.visible_module_ids}
              />
            </StackItem>
            <StackItem>
              <Grid hasGutter>
                <GridItem md={6} style={{ alignSelf: "start" }}>
                  <RecentTasksCard />
                </GridItem>
                <GridItem md={6} style={{ alignSelf: "start" }}>
                  <OverviewWarnings sources={[tlsCertWarning, apiCompatibilityWarning]} />
                </GridItem>
              </Grid>
            </StackItem>
          </Stack>
        ) : null}
      </PageSection>
    </>
  );
}
