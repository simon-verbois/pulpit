import { useMutation } from "@tanstack/react-query";

import { applyDefaultProxyToAllRemotes } from "../../../api/client/pulpitCore/defaultSettings";

export function useApplyProxyToAllRemotesMutation() {
  return useMutation({
    mutationFn: applyDefaultProxyToAllRemotes,
  });
}
