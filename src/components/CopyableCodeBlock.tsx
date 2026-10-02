import { useId, useState } from "react";
import {
  ClipboardCopyButton,
  CodeBlock,
  CodeBlockCode,
  ExpandableSectionToggle,
} from "@patternfly/react-core";

export function CopyableCodeBlock({
  code,
  copyLabel = "Copy configuration",
  previewLines = 4,
}: {
  code: string;
  copyLabel?: string;
  previewLines?: number;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const generatedId = useId().replaceAll(":", "");
  const contentId = `copyable-code-content-${generatedId}`;
  const toggleId = `copyable-code-toggle-${generatedId}`;
  const lines = code.split("\n");
  const preview = lines.slice(0, previewLines).join("\n");
  const isExpandable = lines.length > previewLines;
  const displayedCode = isExpanded ? code : preview;

  const copyAction = (
    <ClipboardCopyButton
      id={`${toggleId}-copy`}
      className="pulpit-copyable-code__copy"
      aria-label={copyLabel}
      variant="plain"
      onClick={() => {
        void navigator.clipboard.writeText(code);
        setIsCopied(true);
      }}
      onTooltipHidden={() => setIsCopied(false)}
    >
      {isCopied ? "Copied" : "Copy"}
    </ClipboardCopyButton>
  );

  return (
    <CodeBlock className="pulpit-copyable-code">
      {copyAction}
      <CodeBlockCode id={contentId}>{displayedCode}</CodeBlockCode>
      {isExpandable ? (
        <ExpandableSectionToggle
          isExpanded={isExpanded}
          onToggle={setIsExpanded}
          contentId={contentId}
          toggleId={toggleId}
          direction="up"
          hasTruncatedContent
        >
          {isExpanded ? "Show less" : "Show full configuration"}
        </ExpandableSectionToggle>
      ) : null}
    </CodeBlock>
  );
}
