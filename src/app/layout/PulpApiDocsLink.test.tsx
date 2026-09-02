import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { PulpApiDocsLink } from "./PulpApiDocsLink";

describe("PulpApiDocsLink", () => {
  it("links to Pulp's own API docs in a new tab", () => {
    render(<PulpApiDocsLink />);

    const link = screen.getByRole("link", { name: /Pulp API documentation/ });
    expect(link).toHaveAttribute("href", "/pulp/api/v3/docs/");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noreferrer");
  });
});
