import { Content } from "@patternfly/react-core";

import { DistributionBasePathConvention } from "../DistributionBasePathConvention";

export function HuggingFaceRepositoriesTopic() {
  return (
    <Content>
      <Content component="p">
        A Hugging Face repository holds files synced or uploaded from the Hub and tracks
        them as a sequence of <strong>versions</strong>. This page is the list of every
        Hugging Face repository; open one to manage its content and configuration.
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

      <Content component="h3">Syncing and publishing</Content>
      <Content component="p">
        <strong>Sync</strong> pulls content from the default remote in the background.
        Unlike RPM/File, there's no autopublish here - a distribution never serves
        anything until you explicitly click <strong>Publish now</strong> (on the{" "}
        <strong>Overview</strong> tab) after syncing.
      </Content>
      <Content component="p">
        Then go to the <strong>Distributions</strong> tab and click{" "}
        <strong>Create distribution</strong> to get a real, selectable URL.{" "}
        <strong>Delete</strong> removes one.
      </Content>
      <DistributionBasePathConvention prefix="hugging-face" />

      <Content component="h3">The Content tab</Content>
      <Content component="p">
        Lists this repository's files. <strong>Upload file</strong> needs a{" "}
        <strong>Relative path</strong> and a <strong>Hub repo ID</strong> (e.g.{" "}
        <code>bert-base-uncased</code>) - unlike every other simple plugin here, a Hugging
        Face file's identity is meaningless without knowing which Hub repo it came from.
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
