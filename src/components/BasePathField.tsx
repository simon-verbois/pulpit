import {
  InputGroup,
  InputGroupItem,
  InputGroupText,
  TextInput,
} from "@patternfly/react-core";

interface BasePathFieldProps {
  id: string;
  /** The fixed, non-editable portion of the URL this base path will be
   * served under (protocol/host + the content-type's own fixed path
   * segment - e.g. "http://localhost:8080/pulp/content/", or just
   * "localhost:8080/" for a container registry reference) - always ends in
   * "/". Shown as a greyed, read-only prefix so only the part the user
   * actually controls is editable, and the field reads as the final URL
   * being built rather than an opaque path fragment. */
  prefix: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  isRequired?: boolean;
}

export function BasePathField({
  id,
  prefix,
  value,
  onChange,
  placeholder,
  isRequired,
}: BasePathFieldProps) {
  return (
    <InputGroup>
      <InputGroupText id={`${id}-prefix`}>{prefix}</InputGroupText>
      <InputGroupItem isFill>
        <TextInput
          id={id}
          isRequired={isRequired}
          value={value}
          onChange={(_event, val) => onChange(val)}
          placeholder={placeholder}
          aria-describedby={`${id}-prefix`}
        />
      </InputGroupItem>
    </InputGroup>
  );
}
