import { useQuery } from "@tanstack/react-query";

import { listCollectionMarks } from "../../../api/client/ansible/collectionMarks";

export function useCollectionMarksQuery(repositoryVersionHref: string) {
  return useQuery({
    queryKey: ["pulp", "ansible", "collectionMarks", repositoryVersionHref],
    queryFn: () =>
      listCollectionMarks({
        limit: 100,
        offset: 0,
        repository_version: repositoryVersionHref,
      }),
  });
}
