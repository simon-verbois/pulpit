import { useState } from "react";
import {
  Button,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  InputGroup,
  InputGroupItem,
  TextInput,
} from "@patternfly/react-core";
import { UiIcon } from "../../../components/icons/UiIcon";

import {
  evaluatePasswordPolicy,
  generateStrongPassword,
  type PasswordPolicyContext,
} from "./passwordPolicy";

interface PasswordFieldProps {
  id: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  isRequired?: boolean;
  /** Shown below the checklist, e.g. "Leave blank to keep the current
   * password." (EditUserModal) - independent of the policy checklist,
   * which only appears once something has actually been typed. */
  helperText?: string;
  username?: string;
  email?: string;
}

/** Shared by Create/Edit user - a password field with a reveal toggle, a
 * "Generate" button that fills in a strong random password, and a live
 * checklist against `passwordPolicy.ts`'s rules (PatternFly's own
 * documented pattern for this: HelperTextItem variants "success"/"error",
 * which render their own check/x icon automatically). The checklist is
 * UX only - Pulp's own validation remains the real authority, surfaced
 * separately if a save is still rejected. */
export function PasswordField({
  id,
  label = "Password",
  value,
  onChange,
  isRequired,
  helperText,
  username,
  email,
}: PasswordFieldProps) {
  const [isRevealed, setIsRevealed] = useState(false);
  const context: PasswordPolicyContext = { username, email };
  const { results } = evaluatePasswordPolicy(value, context);

  return (
    <FormGroup label={label} isRequired={isRequired} fieldId={id}>
      <InputGroup>
        <InputGroupItem isFill>
          <TextInput
            id={id}
            type={isRevealed ? "text" : "password"}
            autoComplete="new-password"
            value={value}
            onChange={(_event, next) => onChange(next)}
          />
        </InputGroupItem>
        <InputGroupItem>
          <Button
            variant="control"
            aria-label={isRevealed ? "Hide password" : "Show password"}
            icon={<UiIcon name={isRevealed ? "eye-off" : "eye"} />}
            onClick={() => setIsRevealed((v) => !v)}
          />
        </InputGroupItem>
        <InputGroupItem>
          <Button
            variant="secondary"
            onClick={() => {
              onChange(generateStrongPassword());
              setIsRevealed(true);
            }}
          >
            Generate
          </Button>
        </InputGroupItem>
      </InputGroup>
      {value.length > 0 ? (
        <FormHelperText>
          <HelperText component="ul" isLiveRegion aria-label="Password requirements">
            {results.map(({ rule, passed }) => (
              <HelperTextItem
                key={rule.id}
                component="li"
                variant={passed ? "success" : "error"}
              >
                {rule.label}
              </HelperTextItem>
            ))}
          </HelperText>
        </FormHelperText>
      ) : helperText ? (
        <FormHelperText>
          <HelperText>
            <HelperTextItem>{helperText}</HelperTextItem>
          </HelperText>
        </FormHelperText>
      ) : null}
    </FormGroup>
  );
}
