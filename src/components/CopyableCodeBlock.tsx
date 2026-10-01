import { useId, useState } from "react";
import {
  ClipboardCopyButton,
  CodeBlock,
  CodeBlockAction,
  CodeBlockCode,
  ExpandableSection,
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
  const remainder = lines.slice(previewLines).join("\n");
  const isExpandable = remainder.length > 0;

  const copyAction = (
    <CodeBlockAction>
      <ClipboardCopyButton
        id={`${toggleId}-copy`}
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
    </CodeBlockAction>
  );

  return (
    <CodeBlock actions={copyAction}>
      <CodeBlockCode>
        {preview}
        {isExpandable ? (
          <ExpandableSection
            isExpanded={isExpanded}
            isDetached
            contentId={contentId}
            toggleId={toggleId}
          >
            {`\n${remainder}`}
          </ExpandableSection>
        ) : null}
      </CodeBlockCode>
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
