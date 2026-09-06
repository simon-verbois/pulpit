import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createMavenRepository } from "../../../api/client/maven/repositories";
import type { MavenRepositoryCreate } from "../../../api/client/maven/types";
import { mavenRepositoriesListRootKey } from "./queryKeys";

/** Synchronous create (VERIFIED: 201, no task). */
export function useCreateMavenRepositoryMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: MavenRepositoryCreate) => createMavenRepository(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mavenRepositoriesListRootKey });
    },
  });
}
