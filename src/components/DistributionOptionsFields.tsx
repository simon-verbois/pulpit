import { useQuery } from "@tanstack/react-query";
import {
  Alert,
  Checkbox,
  ExpandableSection,
  FormGroup,
  FormSelect,
  FormSelectOption,
} from "@patternfly/react-core";
import { useState } from "react";
import { listAllContentGuards } from "../api/client/administration/contentGuards";
import { ErrorState } from "./ErrorState";

export interface DistributionOptions {
  content_guard: string;
  hidden: boolean;
}

export function DistributionOptionsFields({
  value,
  onChange,
  registry = false,
}: {
  value: DistributionOptions;
  onChange: (value: DistributionOptions) => void;
  registry?: boolean;
}) {
  const [expanded, setExpanded] = useState(Boolean(value.content_guard || value.hidden));
  const guards = useQuery({
    queryKey: ["pulp", "contentguards", "all"],
    queryFn: listAllContentGuards,
    enabled: expanded,
  });
  return (
    <ExpandableSection
      toggleText="Access and visibility"
      isExpanded={expanded}
      onToggle={(_, open) => setExpanded(open)}
    >
      {guards.isError ? (
        <ErrorState error={guards.error} onRetry={() => guards.refetch()} />
      ) : null}
      {registry ? (
        <Alert
          isInline
          variant="info"
          title="Registries use redirect guards for blob downloads. Use Private to require registry authentication."
        />
      ) : null}
      <FormGroup label="Content guard" fieldId="distribution-content-guard">
        <FormSelect
          id="distribution-content-guard"
          value={value.content_guard}
          onChange={(_, guard) => onChange({ ...value, content_guard: guard })}
          isDisabled={guards.isPending}
        >
          <FormSelectOption
            value=""
            label={registry ? "Use Pulp's default registry guard" : "No content guard"}
          />
          {value.content_guard &&
          !guards.data?.some((guard) => guard.pulp_href === value.content_guard) ? (
            <FormSelectOption value={value.content_guard} label="Current content guard" />
          ) : null}
          {guards.data
            ?.filter(
              (guard) =>
                !registry ||
                guard.prn.startsWith("prn:core.contentredirectcontentguard:"),
            )
            .map((guard) => (
              <FormSelectOption
                key={guard.pulp_href}
                value={guard.pulp_href}
                label={guard.name}
              />
            ))}
        </FormSelect>
      </FormGroup>
      <Checkbox
        id="distribution-hidden"
        label="Hide from content directory listings"
        description="This only hides directory entries; use a content guard to restrict downloads."
        isChecked={value.hidden}
        onChange={(_, hidden) => onChange({ ...value, hidden })}
      />
    </ExpandableSection>
  );
}
