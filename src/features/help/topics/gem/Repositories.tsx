import { Content } from "@patternfly/react-core";

export function GemRepositoriesTopic() {
  return (
    <Content>
      <Content component="p">
        A Gem repository holds RubyGems packages synced or uploaded from a source, and
        tracks them as a sequence of <strong>versions</strong>. This page is the list of
        every Gem repository; open one to manage its content and configuration.
      </Content>

      <Content component="h3">Creating a repository</Content>
      <Content component="p">
        Click <strong>Create repository</strong> and give it a <strong>Name</strong>{" "}
        (required), optional <strong>Description</strong>, and a{" "}
        <strong>Default remote</strong> if you want <strong>Sync</strong> to work
        without asking each time.
      </Content>
      <Content component="p">
        <strong>Edit</strong> (on a repository's own page) changes the same fields,
        including renaming it. <strong>Delete repository</strong> removes it entirely,
        asynchronously (watch the Tasks panel).
      </Content>

      <Content component="h3">Syncing and publishing</Content>
      <Content component="p">
        <strong>Sync</strong> pulls content from the default remote in the background.
        There's no autopublish here - a distribution never serves anything until you
        explicitly click <strong>Publish now</strong> (on the <strong>Overview</strong>{" "}
        tab) after syncing.
      </Content>
      <Content component="p">
        Then go to the <strong>Distributions</strong> tab and click{" "}
        <strong>Create distribution</strong> to get a real URL (shown with a copy
        button). <strong>Delete</strong> removes one.
      </Content>

      <Content component="h3">The Content tab</Content>
      <Content component="p">
        Lists this repository's gems. <strong>Upload gem</strong> only needs a file - a
        gem's name, version, and platform are parsed from its own embedded metadata, not
        entered by hand.
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
