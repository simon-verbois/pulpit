import { ClipboardCopy } from "@patternfly/react-core";

export function CopyableText({
  value,
  maxCharsDisplayed = 42,
  isCode = false,
}: {
  value: string;
  maxCharsDisplayed?: number;
  isCode?: boolean;
}) {
  return (
    <ClipboardCopy
      variant="inline-compact"
      isCode={isCode}
      isReadOnly
      truncation={{ maxCharsDisplayed, position: "middle" }}
      copyAriaLabel={`Copy ${value}`}
      hoverTip="Copy"
      clickTip="Copied"
    >
      {value}
    </ClipboardCopy>
  );
}
