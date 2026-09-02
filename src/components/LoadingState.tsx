import { Bullseye, Spinner } from "@patternfly/react-core";

export function LoadingState({ label = "Loading..." }: { label?: string }) {
  return (
    <Bullseye>
      <Spinner aria-label={label} />
    </Bullseye>
  );
}
