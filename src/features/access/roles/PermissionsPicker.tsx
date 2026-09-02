import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Checkbox,
  Content,
  Label,
  LabelGroup,
  SearchInput,
} from "@patternfly/react-core";

import { listAllRoles } from "../../../api/client/access/roles";

/** There's no dedicated "list every available permission" endpoint
 * (VERIFIED live schema) - the permission strings already used by *some*
 * role (built-in or custom) are the best available source, so this derives
 * the picker's options from every role's own `permissions` array. A
 * permission that currently belongs to zero roles wouldn't show up here;
 * an accepted gap given there's nothing else to query. */
function useKnownPermissions(): { permissions: string[]; isPending: boolean } {
  const rolesQuery = useQuery({
    queryKey: ["pulp", "access", "roles", "all"],
    queryFn: listAllRoles,
  });
  const permissions = [
    ...new Set((rolesQuery.data ?? []).flatMap((role) => role.permissions)),
  ].sort();
  return { permissions, isPending: rolesQuery.isPending };
}

interface PermissionsPickerProps {
  value: string[];
  onChange: (next: string[]) => void;
}

export function PermissionsPicker({ value, onChange }: PermissionsPickerProps) {
  const { permissions, isPending } = useKnownPermissions();
  const [filter, setFilter] = useState("");

  const filtered = filter
    ? permissions.filter((p) => p.toLowerCase().includes(filter.toLowerCase()))
    : permissions;

  const toggle = (permission: string, checked: boolean) => {
    onChange(checked ? [...value, permission] : value.filter((p) => p !== permission));
  };

  return (
    <div>
      {value.length > 0 ? (
        <LabelGroup
          categoryName="Selected"
          numLabels={value.length}
          style={{ marginBottom: "0.5rem" }}
        >
          {value.map((permission) => (
            <Label key={permission} onClose={() => toggle(permission, false)}>
              {permission}
            </Label>
          ))}
        </LabelGroup>
      ) : null}
      <SearchInput
        aria-label="Filter permissions"
        placeholder="Filter permissions…"
        value={filter}
        onChange={(_event, v) => setFilter(v)}
        onClear={() => setFilter("")}
      />
      <div
        style={{
          maxHeight: "16rem",
          overflowY: "auto",
          border: "1px solid var(--pf-t--global--border--color--default)",
          borderRadius: "var(--pf-t--global--border--radius--small)",
          marginTop: "0.5rem",
          padding: "0.5rem",
        }}
      >
        {isPending ? <Content component="p">Loading permissions…</Content> : null}
        {!isPending && filtered.length === 0 ? (
          <Content component="p">No permissions match "{filter}".</Content>
        ) : null}
        {filtered.map((permission) => (
          <Checkbox
            key={permission}
            id={`permission-${permission}`}
            label={permission}
            isChecked={value.includes(permission)}
            onChange={(_event, checked) => toggle(permission, checked)}
          />
        ))}
      </div>
    </div>
  );
}
