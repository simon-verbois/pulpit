import { useMutation } from "@tanstack/react-query";

import { applySigningToAllRepositories } from "../../../api/client/pulpitCore/signing";

export function useApplySigningToAllRepositoriesMutation() {
  return useMutation({
    mutationFn: applySigningToAllRepositories,
  });
}
