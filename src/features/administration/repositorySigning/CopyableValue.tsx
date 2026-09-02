import { useEffect, useState } from "react";
import { Button, Flex, FlexItem } from "@patternfly/react-core";
import CheckIcon from "@patternfly/react-icons/dist/esm/icons/check-icon";
import CopyIcon from "@patternfly/react-icons/dist/esm/icons/copy-icon";

/** Plain, non-editable text plus a clearly visible copy button - deliberately
 * NOT built on ClipboardCopy, whose non-input variant ("inline-compact")
 * hardcodes a near-invisible plain-style button, and whose input variants
 * still show a text cursor on click despite isReadOnly. Neither is
 * acceptable for values that must read as inert data, not a field. */
export function CopyableValue({
  value,
  isCode = true,
}: {
  value: string;
  isCode?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) {
      return;
    }
    const timer = window.setTimeout(() => setCopied(false), 1500);
    return () => window.clearTimeout(timer);
  }, [copied]);

  return (
    <Flex
      spaceItems={{ default: "spaceItemsSm" }}
      alignItems={{ default: "alignItemsCenter" }}
      flexWrap={{ default: "nowrap" }}
    >
      <FlexItem>{isCode ? <code>{value}</code> : value}</FlexItem>
      <FlexItem>
        <Button
          variant="control"
          aria-label={copied ? "Copied" : "Copy to clipboard"}
          title={copied ? "Copied" : "Copy to clipboard"}
          icon={copied ? <CheckIcon /> : <CopyIcon />}
          onClick={() => {
            navigator.clipboard.writeText(value);
            setCopied(true);
          }}
        />
      </FlexItem>
    </Flex>
  );
}
