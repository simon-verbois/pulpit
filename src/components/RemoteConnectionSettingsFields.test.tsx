import { useState } from "react";
import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderApp } from "../test/renderApp";
import {
  RemoteConnectionSettingsFields,
  type RemoteConnectionSettings,
} from "./RemoteConnectionSettingsFields";

function Form() {
  const [value, setValue] = useState<RemoteConnectionSettings>({});
  return (
    <RemoteConnectionSettingsFields
      idPrefix="remote"
      value={value}
      onChange={setValue}
      hiddenFields={[{ name: "password", is_set: true }]}
    />
  );
}
describe("remote connection settings", () => {
  it("keeps origin credentials and directs proxy configuration to administration", () => {
    renderApp(<Form />);
    fireEvent.click(screen.getByText("Advanced connection settings"));
    expect(screen.getByText(/managed centrally/)).toBeInTheDocument();
    for (const label of [
      "Proxy URL",
      "Proxy username",
      "Proxy password",
      "Trusted CA certificate (PEM)",
      "Use the instance default proxy",
    ])
      expect(screen.queryByLabelText(label)).not.toBeInTheDocument();
    const input = screen.getByLabelText("Origin server username");
    fireEvent.change(input, { target: { value: "oracle-user" } });
    expect(input).toHaveValue("oracle-user");
    expect(screen.getByLabelText("Origin server password")).toHaveAttribute(
      "type",
      "password",
    );
    expect(screen.getByText(/Currently set/)).toBeInTheDocument();
  });
});
