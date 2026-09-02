import { Button } from "@patternfly/react-core";
import { ExternalLinkAltIcon } from "@patternfly/react-icons";

import { apiPath } from "../../api/client/httpClient";

// A small, secondary link to Pulp's own generated API docs - demoted from the
// masthead's primary "Help" action (see HelpButton/HelpPanel) now that Pulpit
// has its own in-app help, but kept available for anyone who wants the raw
// Pulp API reference directly.
export function PulpApiDocsLink() {
  return (
    <Button
      component="a"
      href={apiPath("/docs/")}
      target="_blank"
      rel="noreferrer"
      variant="plain"
      icon={<ExternalLinkAltIcon />}
      iconPosition="end"
      aria-label="Pulp API documentation (opens in a new tab)"
    >
      Pulp API
    </Button>
  );
}
