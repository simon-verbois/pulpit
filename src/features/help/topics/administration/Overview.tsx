import { Content } from "@patternfly/react-core";

export function AdministrationOverviewTopic() {
  return (
    <Content>
      <Content component="p">
        Manage settings for the whole instance. Staff access is required for restricted
        settings.
      </Content>
      <Content component="ul">
        <Content component="li">
          <strong>General</strong>: choose sidebar modules and how long to keep task
          history. The default retention is 90 days.
        </Content>
        <Content component="li">
          <strong>Access</strong>: manage users, groups, roles and LDAP.
        </Content>
        <Content component="li">
          Use the other tabs for signing, content access, HTTPS certificates and the
          outgoing proxy.
        </Content>
      </Content>
      <Content component="p">
        <strong>Purge now</strong> permanently deletes finished tasks older than the saved
        retention, even when automatic deletion is off.
      </Content>
    </Content>
  );
}
