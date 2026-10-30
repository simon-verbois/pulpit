import { collectPulpPages } from "../../../api/client/pagination";
import { useQuery } from "@tanstack/react-query";

import { listCollectionMarks } from "../../../api/client/ansible/collectionMarks";

export function useCollectionMarksQuery(repositoryVersionHref: string) {
  return useQuery({
    queryKey: ["pulp", "ansible", "collectionMarks", repositoryVersionHref],
    queryFn: () =>
      collectPulpPages((offset) =>
        listCollectionMarks({
          limit: 100,
          offset,
          repository_version: repositoryVersionHref,
        }),
      ).then((results) => ({ results, count: results.length })),
  });
}
