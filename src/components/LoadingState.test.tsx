import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LoadingState } from "./LoadingState";

describe("LoadingState", () => {
  it("keeps the table headings visible while announcing loading once", () => {
    render(
      <LoadingState label="Loading repositories" columns={["Name", "Size", "Actions"]} />,
    );
    const table = screen.getByRole("grid", { name: "Loading repositories" });
    expect(table).toHaveAttribute("aria-busy", "true");
    expect(
      within(table)
        .getAllByRole("columnheader")
        .map((cell) => cell.textContent),
    ).toEqual(["Name", "Size", "Actions"]);
    expect(screen.getByRole("status")).toHaveTextContent("Loading repositories");
    expect(within(table).queryByRole("button")).not.toBeInTheDocument();
    expect(within(table).queryByRole("link")).not.toBeInTheDocument();
  });

  it("keeps the compact spinner for non-tabular loading states", () => {
    render(<LoadingState label="Loading task" />);
    expect(screen.getByLabelText("Loading task")).toBeInTheDocument();
    expect(screen.queryByRole("grid")).not.toBeInTheDocument();
  });
});
