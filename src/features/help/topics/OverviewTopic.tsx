import { Content } from "@patternfly/react-core";

export function OverviewTopic() {
  return (
    <Content>
      <Content component="p">
        Manage your software content by choosing a content type in the sidebar.
      </Content>
      <Content component="ul">
        <Content component="li">
          <strong>Remote</strong>: where content comes from.
        </Content>
        <Content component="li">
          <strong>Repository</strong>: where you keep it.
        </Content>
        <Content component="li">
          <strong>Distribution</strong>: the address clients use to download it.
        </Content>
      </Content>
      <Content component="p">
        Check <strong>Overview</strong> for system health and storage. Open{" "}
        <strong>Tasks</strong> to follow operations. A dash in a total means the
        information is not available yet.
      </Content>
      <Content component="p">
        Open <strong>Changelog</strong> at the bottom of the app to read release notes by
        version. New-version notes appear automatically after signing in.
      </Content>
    </Content>
  );
}
