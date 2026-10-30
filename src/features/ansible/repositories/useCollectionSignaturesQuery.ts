import { collectPulpPages } from "../../../api/client/pagination";
import { useQuery } from "@tanstack/react-query";

import { listCollectionSignatures } from "../../../api/client/ansible/collectionSignatures";

export function useCollectionSignaturesQuery(repositoryVersionHref: string) {
  return useQuery({
    queryKey: ["pulp", "ansible", "collectionSignatures", repositoryVersionHref],
    queryFn: () =>
      collectPulpPages((offset) =>
        listCollectionSignatures({
          limit: 100,
          offset,
          repository_version: repositoryVersionHref,
        }),
      ).then((results) => ({ results, count: results.length })),
  });
}
