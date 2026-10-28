import { Content } from "@patternfly/react-core";

export function AnsibleCollectionsTopic() {
  return (
    <Content>
      <Content component="p">
        Find collection versions across all repositories. Upload new collections from a
        repository's <strong>Collections</strong> tab.
      </Content>
      <Content component="p">
        <strong>Deprecate collection…</strong> marks every version of that collection as
        deprecated across repositories. There is no undo action. Do not deprecate an
        already deprecated collection again.
      </Content>
    </Content>
  );
}
