import { useQuery } from "@tanstack/react-query";

import { listObjectRoles } from "../../api/client/access/objectRoles";

export const objectRolesKey = (objectHref: string) =>
  ["pulp", "access", "objectRoles", objectHref] as const;

export function useObjectRolesQuery(objectHref: string) {
  return useQuery({
    queryKey: objectRolesKey(objectHref),
    queryFn: () => listObjectRoles(objectHref),
  });
}
