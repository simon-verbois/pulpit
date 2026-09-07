import { Content } from "@patternfly/react-core";

export function NpmRepositoriesTopic() {
  return (
    <Content>
      <Content component="p">
        An NPM repository holds packages synced or uploaded from a registry, and tracks
        them as a sequence of <strong>versions</strong>. This page is the list of every
        NPM repository; open one to manage its content and configuration.
      </Content>

      <Content component="h3">Creating a repository</Content>
      <Content component="p">
        Click <strong>Create repository</strong> and give it a <strong>Name</strong>{" "}
        (required), optional <strong>Description</strong>, and a{" "}
        <strong>Default remote</strong> if you want <strong>Sync</strong> to work without
        asking each time.
      </Content>
      <Content component="p">
        <strong>Edit</strong> (on a repository's own page) changes the same fields,
        including renaming it. <strong>Delete repository</strong> removes it entirely,
        asynchronously (watch the Tasks panel).
      </Content>

      <Content component="h3">Syncing and distributing</Content>
      <Content component="p">
        <strong>Sync</strong> pulls content from the default remote in the background.
        Unlike gem/hugging_face, there's no publish step here at all - once you go to the{" "}
        <strong>Distributions</strong> tab and click <strong>Create distribution</strong>,
        it serves this repository's latest version immediately. It can optionally also
        proxy a <strong>remote</strong> directly for pull-through caching.{" "}
        <strong>Delete</strong> removes a distribution.
      </Content>

      <Content component="h3">The Content tab</Content>
      <Content component="p">
        Lists this repository's packages. <strong>Upload package</strong> needs a{" "}
        <strong>Relative path</strong> (e.g. <code>my-package-1.0.0.tgz</code>),
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
