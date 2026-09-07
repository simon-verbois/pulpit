import { Grid, GridItem, PageSection, Stack, StackItem } from "@patternfly/react-core";

import { deriveCapabilities } from "../../api/capabilities";
import { OverviewWarnings } from "../../components/OverviewWarnings";
import { PageHeader } from "../../components/PageHeader";
import { LoadingState } from "../../components/LoadingState";
import { ErrorState } from "../../components/ErrorState";
import {
  PulpStatusSummary,
  type RepositoryCountEntry,
} from "../../components/PulpStatusSummary";
import { buildCompatibilityWarnings } from "../../lib/pulpCompatibility";
import { useStatusQuery } from "../../hooks/useStatusQuery";
import { useNavVisibilityQuery } from "../../hooks/useNavVisibilityQuery";
import { RecentTasksCard } from "./RecentTasksCard";
import { useRepositoryCounts } from "./useRepositoryCounts";
import { useComponentSizesQuery } from "./useComponentSizesQuery";
import { useTlsCertWarning } from "./useTlsCertWarning";

export function OverviewPage() {
  const statusQuery = useStatusQuery();
  const navVisibilityQuery = useNavVisibilityQuery();
  const capabilities = statusQuery.data
    ? deriveCapabilities(statusQuery.data)
    : undefined;
  const counts = useRepositoryCounts(capabilities);
  const componentSizesQuery = useComponentSizesQuery();
  const tlsCertWarning = useTlsCertWarning();

  // Keyed by status.versions[].component, so PulpStatusSummary can look
  // each row's count up directly - only plugins Pulpit has a Repositories
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
  const repositoryCounts: Record<string, RepositoryCountEntry> = Object.fromEntries(
    Object.entries(REPOSITORY_PATHS)
      .filter(([component]) => capabilities?.[component as keyof typeof capabilities])
      .map(([component, path]) => [
        component,
        { path, query: counts[component as keyof typeof counts] },
      ]),
  );

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
          <Stack hasGutter>
            <StackItem>
              <PulpStatusSummary
                status={statusQuery.data}
                repositoryCounts={repositoryCounts}
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
                  <OverviewWarnings
                    sources={[buildCompatibilityWarnings(statusQuery.data), tlsCertWarning]}
                  />
                </GridItem>
              </Grid>
            </StackItem>
          </Stack>
        ) : null}
      </PageSection>
    </>
  );
}
