import { useState } from "react";
import {
  Button,
  Checkbox,
  Content,
  Grid,
  GridItem,
  Stack,
  StackItem,
} from "@patternfly/react-core";

import { LoadingState } from "../../../components/LoadingState";
import { ErrorState } from "../../../components/ErrorState";
import { NAV_VISIBILITY_MODULES } from "../../../app/layout/navTree";
import type { NavVisibilitySettings } from "../../../api/client/pulpitCore/types";
import { useNavVisibilitySettingsQuery } from "./useNavVisibilitySettingsQuery";
import { useUpdateNavVisibilitySettingsMutation } from "./useUpdateNavVisibilitySettingsMutation";

/**
 * Which whole nav sections (RPM, Maven, ...) every signed-in user sees at
 * all - staff included, no bypass (a previous revision had one; removed
 * after user feedback that a staff account unchecking a box here must see
 * the effect on its own sidebar too) - a pulpit-native, UI-only convenience
 * (docs/adr/0009-nav-visibility-settings.md), never a substitute for Pulp's
 * own RBAC: a granted section's pages still enforce Pulp's real permissions
 * unchanged, and an un-granted one is still reachable by a direct URL -
 * this only decides what's offered in the sidebar.
 *
 * Global and default-visible: everyone sees EVERYTHING until an
 * administrator unchecks specific sections below - doing so restricts
 * every user equally, including whoever is doing the configuring.
 * Unchecking every box reverts to "unrestricted", not "hide everything" -
 * there is no way to lock everyone out of every section through this
 * screen. There is no per-group or per-user variant any more - one
 * setting, applied instance-wide.
 */
export function NavVisibilitySettingsSection() {
  const settingsQuery = useNavVisibilitySettingsQuery();

  if (settingsQuery.isPending) {
    return <LoadingState label="Loading nav visibility settings" />;
  }
  if (settingsQuery.isError) {
    return (
      <ErrorState error={settingsQuery.error} onRetry={() => settingsQuery.refetch()} />
    );
  }

  return <NavVisibilityForm settings={settingsQuery.data} />;
}

/** An empty stored grant set means "unrestricted" (default-visible - see
 * this file's own top docstring), so the checklist should render as fully
 * checked in that case, not empty - it reflects what's actually visible
 * right now, not the raw stored rows. */
function initialAllowedModuleIds(visibleModuleIds: string[]): string[] {
  return visibleModuleIds.length > 0
    ? visibleModuleIds
    : NAV_VISIBILITY_MODULES.map((mod) => mod.id);
}

function NavVisibilityForm({ settings }: { settings: NavVisibilitySettings }) {
  const updateMutation = useUpdateNavVisibilitySettingsMutation();
  // Initialized once from the fetched data, no effect needed - a
  // successful save updates this same state directly below rather than
  // waiting on the query to resync.
  const [allowed, setAllowed] = useState<Set<string>>(
    () => new Set(initialAllowedModuleIds(settings.visible_module_ids)),
  );
  const [savedAllowed, setSavedAllowed] = useState<Set<string>>(
    () => new Set(initialAllowedModuleIds(settings.visible_module_ids)),
  );

  const isDirty =
    allowed.size !== savedAllowed.size ||
    Array.from(allowed).some((id) => !savedAllowed.has(id));

  const toggle = (moduleId: string, checked: boolean) => {
    setAllowed((current) => {
      const next = new Set(current);
      if (checked) {
        next.add(moduleId);
      } else {
        next.delete(moduleId);
      }
      return next;
    });
  };

  const handleSave = () => {
    const moduleIds = Array.from(allowed);
    updateMutation.mutate(moduleIds, {
      onSuccess: (data) => {
        const saved = new Set(initialAllowedModuleIds(data.visible_module_ids));
        setSavedAllowed(saved);
        setAllowed(saved);
      },
    });
  };

  return (
    <Stack hasGutter>
      <StackItem>
        <Content component="h2">Module visibility</Content>
        <Content component="p">
          Every section is shown to every user by default, including staff - uncheck one
          to hide it for everyone instead. Pulp's own permissions still decide what a user
          can actually do if they navigate to a section directly - this only controls
          what's offered in the sidebar.
        </Content>
      </StackItem>
      <StackItem>
        <Grid hasGutter className="pulpit-settings-options">
          {NAV_VISIBILITY_MODULES.map((mod) => (
            <GridItem key={mod.id} span={12} md={6} xl={4}>
              <Checkbox
                id={`nav-visibility-${mod.id}`}
                label={`Show "${mod.label}"`}
                isChecked={allowed.has(mod.id)}
                onChange={(_event, checked) => toggle(mod.id, checked)}
              />
            </GridItem>
          ))}
        </Grid>
      </StackItem>
      <StackItem>
        <Button
          variant="primary"
          isDisabled={!isDirty || updateMutation.isPending}
          isLoading={updateMutation.isPending}
          onClick={handleSave}
        >
          Save
        </Button>
      </StackItem>
    </Stack>
  );
}
