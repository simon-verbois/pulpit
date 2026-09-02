import { Content } from "@patternfly/react-core";

export function RpmAdvisoriesTopic() {
  return (
    <Content>
      <Content component="p">
        A read-only view of every RPM advisory (errata - security, bugfix, and enhancement
        updates) Pulp knows about, across <strong>every</strong> repository. Each row
        shows the advisory's ID, title, type, severity (color-coded), and issue date.
        Search narrows the list by ID/title/description; there's no per-repository filter
        here (use a repository's own <strong>Advisories</strong> tab for that).
      </Content>
      <Content component="p">
        Most advisories arrive automatically when you sync a remote whose upstream already
        publishes them. To add one by hand, use <strong>Upload advisory</strong> on a
        repository's own <strong>Advisories</strong> tab - the file must be a{" "}
        <strong>JSON document</strong> with fields like <code>id</code>,{" "}
        <code>title</code>, <code>type</code>, <code>severity</code>,{" "}
        <code>description</code>, <code>pkglist</code>, and <code>references</code>. A
        real-world <code>updateinfo.xml</code> file is rejected - that format is what Pulp
        parses <em>during sync</em>, not what this upload endpoint accepts directly.
        There's no upload action on this global page.
      </Content>
    </Content>
  );
}
