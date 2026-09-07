import { useMutation } from "@tanstack/react-query";

import { testFreeIpaConnection } from "../../../api/client/pulpitCore/tls";

export function useTestFreeIpaConnectionMutation() {
  return useMutation({ mutationFn: testFreeIpaConnection });
}
