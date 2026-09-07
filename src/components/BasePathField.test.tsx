import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import { BasePathField } from "./BasePathField";

describe("BasePathField", () => {
  it("shows the fixed prefix as read-only text, separate from the editable input", () => {
    render(
      <BasePathField
        id="distribution-base-path"
        prefix="http://localhost:8080/pulp/content/"
        value="my-repo"
        onChange={() => {}}
      />,
    );

    expect(screen.getByText("http://localhost:8080/pulp/content/")).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toHaveValue("my-repo");
  });

  it("only lets the user edit the suffix, not the prefix", () => {
    function Harness() {
      const [value, setValue] = useState("my-repo");
      return (
        <BasePathField
          id="distribution-base-path"
          prefix="http://localhost:8080/pulp/content/"
          value={value}
          onChange={setValue}
        />
      );
    }
    render(<Harness />);

    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "another-repo" } });

    expect(input).toHaveValue("another-repo");
    expect(screen.getByText("http://localhost:8080/pulp/content/")).toBeInTheDocument();
  });

  it("calls onChange with the raw suffix value only", () => {
    const onChange = vi.fn();
    render(
      <BasePathField
        id="distribution-base-path"
        prefix="http://localhost:8080/pulp/content/"
        value=""
        onChange={onChange}
      />,
    );

    fireEvent.change(screen.getByRole("textbox"), { target: { value: "x" } });

    expect(onChange).toHaveBeenCalledWith("x");
  });
});
