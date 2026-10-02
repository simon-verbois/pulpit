import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CopyableCodeBlock } from "./CopyableCodeBlock";

describe("CopyableCodeBlock", () => {
  it("shows a short preview and expands the remaining configuration", () => {
    const { container } = render(
      <CopyableCodeBlock code={"one\ntwo\nthree\nfour"} previewLines={2} />,
    );

    const code = container.querySelector("pre");
    expect(code?.textContent).toBe("one\ntwo");
    expect(screen.queryByText(/three/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Show full configuration" }));

    expect(code?.textContent).toBe("one\ntwo\nthree\nfour");
    expect(screen.getByRole("button", { name: "Show less" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Copy configuration" }),
    ).toBeInTheDocument();
  });
});
