import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import { SearchableSingleSelect } from "./SearchableSingleSelect";

function open() {
  fireEvent.click(screen.getByRole("combobox"));
}

describe("SearchableSingleSelect", () => {
  it("renders every option when the list is small", () => {
    render(
      <SearchableSingleSelect
        id="test"
        ariaLabel="Role"
        options={["viewer", "owner", "creator"]}
        selected=""
        onChange={() => {}}
        placeholder="Select a role…"
        noOptionsText="No roles are available."
      />,
    );
    open();

    expect(screen.getByRole("option", { name: "viewer" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "owner" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "creator" })).toBeInTheDocument();
    expect(screen.queryByText(/more - keep typing/)).not.toBeInTheDocument();
  });

  it("caps rendering at 100 options and hints how many more match, for a large list", () => {
    const options = Array.from(
      { length: 150 },
      (_, i) => `role-${String(i).padStart(3, "0")}`,
    );
    render(
      <SearchableSingleSelect
        id="test"
        ariaLabel="Role"
        options={options}
        selected=""
        onChange={() => {}}
        placeholder="Select a role…"
        noOptionsText="No roles are available."
      />,
    );
    open();

    expect(screen.getAllByRole("option")).toHaveLength(101); // 100 + the "+N more" hint
    expect(screen.getByText("+50 more - keep typing to narrow down")).toBeInTheDocument();
  });
});
