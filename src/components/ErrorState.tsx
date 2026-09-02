import { useState } from "react";
import { Alert, AlertActionLink, CodeBlock, CodeBlockCode } from "@patternfly/react-core";

import { PulpApiError } from "../api/errors/PulpApiError";

interface ErrorStateProps {
  error: unknown;
  onRetry?: () => void;
}

function messageFor(error: unknown): string {
  if (error instanceof PulpApiError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Something went wrong.";
}

export function ErrorState({ error, onRetry }: ErrorStateProps) {
  const [showDetail, setShowDetail] = useState(false);
  const detail = error instanceof PulpApiError ? error.detail : undefined;

  return (
    <Alert
      variant="danger"
      title={messageFor(error)}
      actionLinks={
        <>
          {onRetry ? <AlertActionLink onClick={onRetry}>Retry</AlertActionLink> : null}
          {detail !== undefined ? (
            <AlertActionLink onClick={() => setShowDetail((v) => !v)}>
              {showDetail ? "Hide technical details" : "Show technical details"}
            </AlertActionLink>
          ) : null}
        </>
      }
    >
      {showDetail && detail !== undefined ? (
        <CodeBlock>
          <CodeBlockCode>
            {typeof detail === "string" ? detail : JSON.stringify(detail, null, 2)}
          </CodeBlockCode>
        </CodeBlock>
      ) : null}
    </Alert>
  );
}
