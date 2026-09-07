import { Content } from "@patternfly/react-core";

export function DebRepositoriesTopic() {
  return (
    <Content>
      <Content component="p">
        A Debian repository holds packages synced or uploaded from an archive mirror, and
        tracks them as a sequence of <strong>versions</strong>. This page is the list of
        every Debian repository; open one to manage its content and configuration.
      </Content>

      <Content component="h3">Creating a repository</Content>
      <Content component="p">
        Click <strong>Create repository</strong> and give it a <strong>Name</strong>{" "}
        (required), optional <strong>Description</strong>, a{" "}
        <strong>Default remote</strong> if you want <strong>Sync</strong> to work without
        asking each time, and leave <strong>Automatically publish</strong> checked (the
        default) unless you want to control publishing manually.
      </Content>
      <Content component="p">
        <strong>Edit</strong> (on a repository's own page) changes the same fields,
        including renaming it. <strong>Delete repository</strong> removes it entirely,
        asynchronously (watch the Tasks panel).
      </Content>

      <Content component="h3">Syncing and publishing</Content>
      <Content component="p">
        <strong>Sync</strong> pulls content from the default remote in the background.
        With autopublish on (the default), the repository's distribution is updated
        automatically after every sync or upload; <strong>Publish now</strong> forces an
        immediate republish.
      </Content>
      <Content component="p">
        Go to the <strong>Distributions</strong> tab and click{" "}
        <strong>Create distribution</strong> to get a real URL (shown with a copy button).{" "}
        <strong>Delete</strong> removes one.
      </Content>

      <Content component="h3">The Content tab</Content>
      <Content component="p">
        Lists this repository's packages. <strong>Upload package</strong> needs a{" "}
        <strong>Relative path</strong> (e.g. <code>my-package_1.0_amd64.deb</code>),
        pre-filled from the chosen file's own name.
      </Content>

      <Content component="h3">The Versions and Access tabs</Content>
      <Content component="p">
        Versions lists every version ever created, newest first, with the current one
        labeled. Access grants roles scoped to this one repository - see the{" "}
        <strong>Access</strong> help topic for how roles and grants work in general.
      </Content>
    </Content>
  );
}
