import { FormSelectOption, FormSelectOptionGroup } from "@patternfly/react-core";

import type { RpmRemoteOption } from "../../../api/client/rpm/remotes";

/** "Default remote" select options, grouped by remote flavor - a ULN remote
 * and a standard remote can share a name, so the group makes it unambiguous. */
export function RemoteOptionGroups({ remotes }: { remotes: RpmRemoteOption[] }) {
  const standard = remotes.filter((r) => r.kind === "standard");
  const uln = remotes.filter((r) => r.kind === "uln");
  return (
    <>
      {standard.length > 0 ? (
        <FormSelectOptionGroup label="Standard remotes">
          {standard.map((r) => (
            <FormSelectOption key={r.pulp_href} value={r.pulp_href} label={r.name} />
          ))}
        </FormSelectOptionGroup>
      ) : null}
      {uln.length > 0 ? (
        <FormSelectOptionGroup label="ULN remotes">
          {uln.map((r) => (
            <FormSelectOption key={r.pulp_href} value={r.pulp_href} label={r.name} />
          ))}
        </FormSelectOptionGroup>
      ) : null}
    </>
  );
}
