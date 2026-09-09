import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import { SearchableMultiSelect } from "./SearchableMultiSelect";

function open() {
  fireEvent.click(screen.getByRole("combobox"));
}

describe("SearchableMultiSelect", () => {
  it("renders every option when the list is small", () => {
    render(
      <SearchableMultiSelect
        id="test"
        ariaLabel="Users"
        options={["alice", "bob", "carol"]}
        selected={[]}
        onChange={() => {}}
        placeholder="Select users…"
        noOptionsText="No users are available."
      />,
    );
    open();

    expect(screen.getByRole("option", { name: "alice" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "bob" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "carol" })).toBeInTheDocument();
    expect(screen.queryByText(/more - keep typing/)).not.toBeInTheDocument();
  });

  it("caps rendering at 100 options and hints how many more match, for a large list", () => {
    const options = Array.from(
      { length: 250 },
      (_, i) => `user-${String(i).padStart(3, "0")}`,
    );
    render(
      <SearchableMultiSelect
        id="test"
        ariaLabel="Users"
        options={options}
        selected={[]}
        onChange={() => {}}
        placeholder="Select users…"
        noOptionsText="No users are available."
      />,
    );
    open();

    expect(screen.getAllByRole("option")).toHaveLength(101); // 100 + the "+N more" hint
    expect(
      screen.getByText("+150 more - keep typing to narrow down"),
    ).toBeInTheDocument();
  });

  it("narrowing the search still searches the full option list, not just the first 100 rendered", () => {
    const options = Array.from(
      { length: 250 },
      (_, i) => `user-${String(i).padStart(3, "0")}`,
    );
    render(
      <SearchableMultiSelect
        id="test"
        ariaLabel="Users"
        options={options}
        selected={[]}
        onChange={() => {}}
        placeholder="Select users…"
        noOptionsText="No users are available."
      />,
    );
    open();

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "user-249" } });

    expect(screen.getByRole("option", { name: "user-249" })).toBeInTheDocument();
  });
});
