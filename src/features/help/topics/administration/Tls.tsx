import { Content } from "@patternfly/react-core";

export function AdministrationTlsTopic() {
  return (
    <Content>
      <Content component="p">
        Pulpit serves HTTPS on port 8443 with one active certificate. A reverse proxy or
        ingress can terminate the public TLS connection and forward requests to Pulpit on
        plain HTTP port 8080.
      </Content>

      <Content component="h3">Self-signed certificate</Content>
      <Content component="p">
        A self-signed certificate is generated automatically on first boot. It is valid
        for two years and is renewed automatically before expiry. Use{" "}
        <strong>Regenerate self-signed certificate</strong> to replace it immediately or
        to switch back from an imported certificate.
      </Content>

      <Content component="h3">Importing a certificate</Content>
      <Content component="p">
        Open the <strong>Manual</strong> tab and click <strong>Upload certificate</strong>
        . Paste the PEM certificate and its matching unencrypted RSA or EC private key.
        Pulpit validates the pair before installing it and reloading nginx.
      </Content>
      <Content component="p">
        Imported certificates are not renewed by Pulpit. Replace one when the Overview
        warning reports that it is approaching expiry. If TLS ends at an ingress or
        reverse proxy, renew the public certificate there instead.
      </Content>
    </Content>
  );
}
