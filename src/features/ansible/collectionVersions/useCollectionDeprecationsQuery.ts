import { collectPulpPages } from "../../../api/client/pagination";
import { useQuery } from "@tanstack/react-query";

import { listCollectionDeprecations } from "../../../api/client/ansible/collectionDeprecations";

export const collectionDeprecationsListRootKey = [
  "pulp",
  "ansible",
  "collectionDeprecations",
] as const;

export function useCollectionDeprecationsQuery() {
  return useQuery({
    queryKey: collectionDeprecationsListRootKey,
    queryFn: () =>
      collectPulpPages((offset) =>
        listCollectionDeprecations({ limit: 100, offset }),
      ).then((results) => ({ results, count: results.length })),
  });
}
