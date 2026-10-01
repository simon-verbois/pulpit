import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CopyableText } from "./CopyableText";

describe("CopyableText", () => {
  it("shows a truncated value with an accessible copy action", () => {
    const value = "a-very-long-generated-resource-identifier-123456789";

    render(<CopyableText value={value} maxCharsDisplayed={24} isCode />);

    expect(screen.getByText(/a-very-long/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: `Copy ${value}` })).toBeInTheDocument();
  });
});
