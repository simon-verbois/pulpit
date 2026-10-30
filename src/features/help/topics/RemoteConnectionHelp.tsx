import { Content } from "@patternfly/react-core";

export function RemoteConnectionHelp() {
  return (
    <Content component="p">
      In <strong>Advanced connection settings</strong>, choose{" "}
      <strong>Ignore SSL certificate errors</strong>
      to disable certificate checks for this remote. ULN shows this option directly. It is
      off by default; proxy routing and trusted certificates remain in
      <strong> Administration → Global Proxy Settings</strong>.
    </Content>
  );
}
