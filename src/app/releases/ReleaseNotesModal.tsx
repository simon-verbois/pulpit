import {
  Button,
  Content,
  Flex,
  FormGroup,
  FormSelect,
  FormSelectOption,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Stack,
  StackItem,
} from "@patternfly/react-core";

import { RELEASE_NOTES } from "./notes";

interface ReleaseNotesModalProps {
  isOpen: boolean;
  selectedVersion: string;
  onSelectVersion: (version: string) => void;
  onClose: () => void;
}

export function ReleaseNotesModal({
  isOpen,
  selectedVersion,
  onSelectVersion,
  onClose,
}: ReleaseNotesModalProps) {
  const release = RELEASE_NOTES.find((notes) => notes.version === selectedVersion)!;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      variant="medium"
      aria-labelledby="release-notes-title"
    >
      <ModalHeader title="What's new in PulpIT" labelId="release-notes-title" />
      <ModalBody tabIndex={0} aria-label="Release notes">
        <Stack hasGutter>
          <StackItem>
            <FormGroup label="Version" fieldId="release-notes-version">
              <FormSelect
                id="release-notes-version"
                value={selectedVersion}
                onChange={(_event, value) => onSelectVersion(value)}
              >
                {RELEASE_NOTES.map((notes) => (
                  <FormSelectOption
                    key={notes.version}
                    value={notes.version}
                    label={`${notes.version} — ${notes.date}`}
                  />
                ))}
              </FormSelect>
            </FormGroup>
          </StackItem>
          <StackItem>
            <Content>
              {release.sections.map((section) => (
                <section key={section.title}>
                  <Content component="h2">{section.title}</Content>
                  <Content component="ul">
                    {section.entries.map((entry, index) => (
                      <Content component="li" key={index}>
                        {entry}
                      </Content>
                    ))}
                  </Content>
                </section>
              ))}
            </Content>
          </StackItem>
        </Stack>
      </ModalBody>
      <ModalFooter>
        <Flex
          justifyContent={{ default: "justifyContentFlexEnd" }}
          style={{ width: "100%" }}
        >
          <Button variant="primary" onClick={onClose}>
            Close
          </Button>
        </Flex>
      </ModalFooter>
    </Modal>
  );
}
