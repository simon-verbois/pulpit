import { Navigate, Outlet, useLocation } from "react-router-dom";
import { PageSection } from "@patternfly/react-core";

import { PulpApiError } from "../../api/errors/PulpApiError";
import { ErrorState } from "../../components/ErrorState";
import { LoadingState } from "../../components/LoadingState";
import { useCurrentUserQuery } from "../../hooks/useCurrentUserQuery";

/** Gates every route below it on an authenticated Pulp session. */
export function RequireAuth() {
  const currentUserQuery = useCurrentUserQuery();
  const location = useLocation();

  if (currentUserQuery.isPending) {
    return <LoadingState label="Checking your Pulp session" />;
  }

  if (currentUserQuery.isError) {
    const error = currentUserQuery.error;
    if (error instanceof PulpApiError && error.kind === "unauthenticated") {
      const next = encodeURIComponent(`${location.pathname}${location.search}`);
      return <Navigate to={`/login?next=${next}`} replace />;
    }
    // Any other error (Pulp unreachable, etc.) is not "please log in" -
    // show it as a real error rather than a misleading redirect.
    return (
      <PageSection hasBodyWrapper={false}>
        <ErrorState error={error} onRetry={() => currentUserQuery.refetch()} />
      </PageSection>
    );
  }

  return <Outlet />;
}
