import { Button } from "@patternfly/react-core";
import { HelpIcon } from "@patternfly/react-icons";

export function HelpButton({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="plain" icon={<HelpIcon />} onClick={onClick}>
      Help
    </Button>
  );
}
