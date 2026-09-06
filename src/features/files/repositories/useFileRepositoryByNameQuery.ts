import { useQuery } from "@tanstack/react-query";

import { getFileRepositoryByName } from "../../../api/client/file/repositories";
import { fileRepositoryByNameKey } from "./queryKeys";

export function useFileRepositoryByNameQuery(name: string) {
  return useQuery({
    queryKey: fileRepositoryByNameKey(name),
    queryFn: () => getFileRepositoryByName(name),
  });
}
