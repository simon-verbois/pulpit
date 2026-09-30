import { Content } from "@patternfly/react-core";
import { Link } from "react-router-dom";

import type {
  ResolvedTaskResource,
  TaskResourceRef,
} from "../../api/client/taskResources";
import { resourceRoute, resourceTypeLabel } from "./taskDescription";

/** The resource's name (linked to its Pulpit page when it has one) over its
 * type. A ref Pulp no longer returns was deleted after the task ran. */
export function TaskResourceCell({
  resource,
  resolved,
  isResolving,
}: {
  resource: TaskResourceRef | undefined;
  resolved: ResolvedTaskResource | undefined;
  isResolving: boolean;
}) {
  if (!resource) return <>—</>;

  const route = resourceRoute(resource, resolved);
  let name;
  if (resolved?.name) {
    name = route ? <Link to={route}>{resolved.name}</Link> : resolved.name;
  } else if (isResolving) {
    name = "…";
  } else {
    name = <i>{resolved ? "unnamed" : "deleted"}</i>;
  }

  return (
    <>
      <div>{name}</div>
      <Content component="small">{resourceTypeLabel(resource)}</Content>
    </>
  );
}
