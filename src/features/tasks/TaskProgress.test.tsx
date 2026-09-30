import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import type { PulpProgressReport } from "../../api/client/tasks";
import { TaskProgress } from "./TaskProgress";

// Shapes copied from a real pulp_rpm sync task's progress_reports.
const REPORTS: PulpProgressReport[] = [
  {
    message: "Downloading Metadata Files",
    code: "sync.downloading.metadata",
    state: "completed",
    total: null,
    done: 6,
  },
  {
    message: "Skipping Packages",
    code: "sync.skipped.packages",
    state: "completed",
    total: 0,
    done: 0,
  },
  {
    message: "Parsed Packages",
    code: "sync.parsing.packages",
    state: "running",
    total: 35,
    done: 12,
  },
  {
    message: "Downloading Artifacts",
    code: "sync.downloading.artifacts",
    state: "running",
    total: null,
    done: 4,
  },
];

describe("TaskProgress", () => {
  it("renders a bar only for reports with a total, a counter otherwise, and hides 0/0 noise", () => {
    render(<TaskProgress reports={REPORTS} heading={<h4>Progress</h4>} />);

    expect(screen.getByText("Progress")).toBeInTheDocument();
    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuenow", "12");
    expect(bar).toHaveAttribute("aria-valuemax", "35");
    expect(screen.getAllByText("12 / 35").length).toBeGreaterThan(0);
    expect(screen.getByText("Downloading Metadata Files")).toBeInTheDocument();
    expect(screen.getByText("6")).toBeInTheDocument();
    expect(screen.queryByText("Skipping Packages")).not.toBeInTheDocument();
  });

  it("narrows to in-flight stages with runningOnly", () => {
    render(<TaskProgress reports={REPORTS} runningOnly />);

    expect(screen.getByText("Downloading Artifacts")).toBeInTheDocument();
    expect(screen.queryByText("Downloading Metadata Files")).not.toBeInTheDocument();
  });

  it("renders nothing, heading included, when no report is worth showing", () => {
    const { container } = render(
      <TaskProgress reports={[REPORTS[1]]} heading={<h4>Progress</h4>} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
