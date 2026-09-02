import { useQuery } from "@tanstack/react-query";

import { listCollectionSignatures } from "../../../api/client/ansible/collectionSignatures";

export function useCollectionSignaturesQuery(repositoryVersionHref: string) {
  return useQuery({
    queryKey: ["pulp", "ansible", "collectionSignatures", repositoryVersionHref],
    queryFn: () =>
      listCollectionSignatures({
        limit: 100,
        offset: 0,
        repository_version: repositoryVersionHref,
      }),
  });
}
