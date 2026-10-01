import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CopyableCodeBlock } from "./CopyableCodeBlock";

describe("CopyableCodeBlock", () => {
  it("shows a short preview and expands the remaining configuration", () => {
    render(<CopyableCodeBlock code={"one\ntwo\nthree\nfour"} previewLines={2} />);

    expect(screen.getByText(/one/)).toBeInTheDocument();
    expect(screen.getByText(/three/)).not.toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Show full configuration" }));

    expect(screen.getByText(/three/)).toBeVisible();
    expect(screen.getByRole("button", { name: "Show less" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Copy configuration" }),
    ).toBeInTheDocument();
  });
});
