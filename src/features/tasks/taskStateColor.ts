import type { PulpTaskState } from "../../api/client/tasks";

export const TASK_STATE_COLOR: Record<
  PulpTaskState,
  "grey" | "blue" | "green" | "red" | "orange" | "yellow"
> = {
  waiting: "grey",
  running: "blue",
  completed: "green",
  failed: "red",
  canceled: "grey",
  canceling: "orange",
  skipped: "yellow",
};
