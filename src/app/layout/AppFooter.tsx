import { useState } from "react";
import { Button, Content } from "@patternfly/react-core";

import { ReleaseNotesModal } from "../releases/ReleaseNotesModal";
import { hasNewRelease, rememberRelease } from "../releases/seenRelease";

export function AppFooter({ userId }: { userId: string }) {
  const [isOpen, setIsOpen] = useState(() => hasNewRelease(userId, __APP_VERSION__));
  const [selectedVersion, setSelectedVersion] = useState(__APP_VERSION__);

  function close() {
    rememberRelease(userId, __APP_VERSION__);
    setIsOpen(false);
  }

  return (
    <>
      <div className="pulpit-footer">
        <Content
          component="small"
          style={{ color: "var(--pf-t--global--text--color--subtle)" }}
        >
          {__APP_VERSION__} —{" "}
          <Button
            variant="link"
            isInline
            style={{ pointerEvents: "auto" }}
            onClick={() => {
              setSelectedVersion(__APP_VERSION__);
              setIsOpen(true);
            }}
          >
            Changelog
          </Button>{" "}
          — MIT License
        </Content>
      </div>
      <ReleaseNotesModal
        isOpen={isOpen}
        selectedVersion={selectedVersion}
        onSelectVersion={setSelectedVersion}
        onClose={close}
      />
    </>
  );
}
