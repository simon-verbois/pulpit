import {
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
} from "@patternfly/react-core";

import type { User } from "../../../api/client/access/types";
import { formatRelativeTime } from "../../../lib/relativeTime";

export function UserOverviewTab({ user }: { user: User }) {
  return (
    <DescriptionList isHorizontal>
      <DescriptionListGroup>
        <DescriptionListTerm>Username</DescriptionListTerm>
        <DescriptionListDescription>{user.username}</DescriptionListDescription>
      </DescriptionListGroup>
      <DescriptionListGroup>
        <DescriptionListTerm>Name</DescriptionListTerm>
        <DescriptionListDescription>
          {[user.first_name, user.last_name].filter(Boolean).join(" ") || "—"}
        </DescriptionListDescription>
      </DescriptionListGroup>
      <DescriptionListGroup>
        <DescriptionListTerm>Email</DescriptionListTerm>
        <DescriptionListDescription>{user.email || "—"}</DescriptionListDescription>
      </DescriptionListGroup>
      <DescriptionListGroup>
        <DescriptionListTerm>Status</DescriptionListTerm>
        <DescriptionListDescription>
          {user.is_active ? "Active" : "Inactive"}
        </DescriptionListDescription>
      </DescriptionListGroup>
      <DescriptionListGroup>
        <DescriptionListTerm>Staff</DescriptionListTerm>
        <DescriptionListDescription>
          {user.is_staff ? "Yes" : "No"}
        </DescriptionListDescription>
      </DescriptionListGroup>
      <DescriptionListGroup>
        <DescriptionListTerm>Joined</DescriptionListTerm>
        <DescriptionListDescription>
          {formatRelativeTime(user.date_joined)}
        </DescriptionListDescription>
      </DescriptionListGroup>
    </DescriptionList>
  );
}
