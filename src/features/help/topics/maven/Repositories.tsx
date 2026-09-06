import { Content } from "@patternfly/react-core";

export function MavenRepositoriesTopic() {
  return (
    <Content>
      <Content component="p">
        A Maven repository holds artifacts uploaded to it, and tracks them as a
        sequence of <strong>versions</strong>. This page is the list of every Maven
        repository; open one to manage its content and configuration.
      </Content>

      <Content component="h3">Creating a repository</Content>
      <Content component="p">
        Click <strong>Create repository</strong> and give it a <strong>Name</strong>{" "}
        (required) and an optional <strong>Description</strong>. Unlike every other
        plugin here, there's no default remote to set - this plugin has no sync action
        at all.
      </Content>
      <Content component="p">
        <strong>Edit</strong> (on a repository's own page) changes the same fields,
        including renaming it. <strong>Delete repository</strong> removes it entirely,
        asynchronously (watch the Tasks panel).
      </Content>

      <Content component="h3">Getting content in - and out</Content>
      <Content component="p">
        Go to the <strong>Content</strong> tab and click <strong>Upload artifact</strong>{" "}
        - it needs a file and a <strong>Relative path</strong> (its Maven coordinates,
        e.g. <code>com/example/my-lib/1.0/my-lib-1.0.jar</code>). This is tracked as a
        background task, same as everywhere else.
      </Content>
      <Content component="p">
        Then go to the <strong>Distributions</strong> tab and click{" "}
        <strong>Create distribution</strong> to get a real URL (shown with a copy
        button) - it serves this repository's latest version immediately, with no
        publish step. It can optionally also proxy a <strong>remote</strong> directly
        for pull-through caching. <strong>Delete</strong> removes a distribution.
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
