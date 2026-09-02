import { useState, type Ref } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dropdown,
  DropdownItem,
  DropdownList,
  MenuToggle,
  type MenuToggleElement,
} from "@patternfly/react-core";
import { UserIcon } from "@patternfly/react-icons";

import { useCurrentUserQuery } from "../../hooks/useCurrentUserQuery";
import { useLogoutMutation } from "../../features/auth/useLogoutMutation";

export function UserMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const currentUserQuery = useCurrentUserQuery();
  const logoutMutation = useLogoutMutation();
  const navigate = useNavigate();

  // AppLayout only ever renders behind RequireAuth, so this should always
  // be populated - but render nothing rather than crash if it's momentarily not.
  if (!currentUserQuery.data) {
    return null;
  }

  return (
    <Dropdown
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      onSelect={() => setIsOpen(false)}
      popperProps={{ position: "end" }}
      toggle={(toggleRef: Ref<MenuToggleElement>) => (
        <MenuToggle
          ref={toggleRef}
          variant="plain"
          icon={<UserIcon />}
          isExpanded={isOpen}
          onClick={() => setIsOpen((open) => !open)}
        >
          {currentUserQuery.data.username}
        </MenuToggle>
      )}
    >
      <DropdownList>
        <DropdownItem
          key="logout"
          isDisabled={logoutMutation.isPending}
          onClick={() =>
            logoutMutation.mutate(undefined, { onSuccess: () => navigate("/login") })
          }
        >
          Log out
        </DropdownItem>
      </DropdownList>
    </Dropdown>
  );
}
