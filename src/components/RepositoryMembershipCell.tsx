import { Button, Skeleton } from "@patternfly/react-core";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import {
  listRepositoriesContainingContent,
  type RepositoryKind,
} from "../api/client/repositoryMembership";

const REPOSITORY_ROUTES: Record<RepositoryKind, string> = {
  ansible: "/ansible/repositories",
  container: "/containers/repositories",
  deb: "/deb/repositories",
  file: "/files/repositories",
  gem: "/gems/repositories",
  huggingFace: "/hugging-face/repositories",
  maven: "/maven/repositories",
  npm: "/npm/repositories",
  python: "/python/repositories",
  rpm: "/rpm/repositories",
};

interface RepositoryMembershipCellProps {
  contentHref: string;
  repositoryKind: RepositoryKind;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Could not load repositories.";
}

export function RepositoryMembershipCell({
  contentHref,
  repositoryKind,
}: RepositoryMembershipCellProps) {
  const query = useQuery({
    queryKey: ["pulp", "repositoryMembership", repositoryKind, contentHref],
    queryFn: () => listRepositoriesContainingContent(repositoryKind, contentHref),
    staleTime: 60_000,
  });

  if (query.isPending) {
    return <Skeleton width="5rem" screenreaderText="Loading repositories" />;
  }
  if (query.isError) {
    return (
      <Button
        variant="link"
        isInline
        onClick={() => query.refetch()}
        title={errorMessage(query.error)}
      >
        Unavailable — retry
      </Button>
    );
  }
  if (query.data.length === 0) {
    return <>—</>;
  }

  const route = REPOSITORY_ROUTES[repositoryKind];
  return (
    <>
      {query.data.map((repository, index) => (
        <span key={repository.pulp_href}>
          {index > 0 ? ", " : null}
          <Link to={`${route}/${encodeURIComponent(repository.name)}`}>
            {repository.name}
          </Link>
        </span>
      ))}
    </>
  );
}
