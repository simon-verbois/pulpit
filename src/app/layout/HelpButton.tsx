import { Button } from "@patternfly/react-core";

export function HelpButton({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="plain" onClick={onClick}>
      Helper
    </Button>
  );
}
