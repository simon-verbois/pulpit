import { useMutation, useQueryClient } from "@tanstack/react-query";

import { runFreeIpaWizardSetup } from "../../../api/client/pulpitCore/tls";
import { tlsFreeIpaSettingsKey } from "./queryKeys";

/** Not job/polling-based - see docs/tls.md "Guided setup (wizard)": the
 * whole point is that the admin password never survives past this one
 * request, so there's nothing for a job to poll in the first place. */
export function useRunFreeIpaWizardSetupMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: runFreeIpaWizardSetup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tlsFreeIpaSettingsKey });
    },
  });
}
