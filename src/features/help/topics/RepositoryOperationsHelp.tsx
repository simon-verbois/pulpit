import { Content } from "@patternfly/react-core";

/** Common task guidance for the shared repository controls. */
export function RepositoryOperationsHelp({
  sync = true,
  copy = false,
}: {
  sync?: boolean;
  copy?: boolean;
}) {
  return (
    <Content component="p">
      {sync ? (
        <>
          Use <strong>Sync with options…</strong> to choose a remote or mirror mode.
          Mirroring can remove content.{" "}
        </>
      ) : null}
      In <strong>Distributions</strong>, <strong>Edit</strong> changes the target or
      access settings; <strong>Reconnect</strong> reuses an unused URL after recreating a
      repository.
      {copy ? (
        <>
          {" "}
          In <strong>Versions</strong>, <strong>Copy to…</strong> also accepts older
          snapshots and selected content.
        </>
      ) : null}
    </Content>
  );
}
