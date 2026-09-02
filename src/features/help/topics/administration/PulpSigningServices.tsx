import { Content } from "@patternfly/react-core";

export function AdministrationPulpSigningServicesTopic() {
  return (
    <Content>
      <Content component="p">
        This page is a plain, read-only view of Pulp's own{" "}
        <code>core.SigningService</code> objects — whatever signing services exist on your
        Pulp deployment, for any content type (not just RPM). It has nothing to do with
        PulpIT's own managed key in <strong>Repository Signing</strong> other than that
        Repository Signing's key, once published, shows up as an entry here too.
      </Content>

      <Content component="h3">Why there's no Create/Edit/Delete here</Content>
      <Content component="p">
        Pulp's API only ever exposes <code>GET</code> on signing services — there is no
        create/update/delete endpoint at all. Setting one up requires a signing script
        placed on the Pulp server and a <code>pulpcore-manager add-signing-service</code>{" "}
        management command run there directly. This is a genuine Pulp-side limitation, not
        something missing from PulpIT.
      </Content>

      <Content component="h3">What you can do</Content>
      <Content component="p">
        Search by name, and use <strong>View</strong> on any row to see its full public
        key and the absolute path of its signing script on the Pulp server — useful for
        double-checking exactly which key a repository's <strong>Sign content…</strong>
        /signing configuration would actually use. A service's fingerprint (shown in the
        list) is also what a repository's signing fields reference.
      </Content>
    </Content>
  );
}
