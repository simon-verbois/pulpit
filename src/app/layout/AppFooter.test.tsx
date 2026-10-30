import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";

import { AppFooter } from "./AppFooter";
import { rememberRelease } from "../releases/seenRelease";

let userId: string;

beforeEach(() => {
  userId = crypto.randomUUID();
  localStorage.clear();
  for (const cookie of document.cookie.split(";")) {
    document.cookie = `${cookie.split("=")[0].trim()}=; Max-Age=0; Path=/`;
  }
});

describe("release notes", () => {
  it("announces the running release and keeps it dismissed across app mounts", async () => {
    const first = render(<AppFooter userId={userId} />);
    const dialog = await screen.findByRole("dialog", { name: "What's new in PulpIT" });
    expect(within(dialog).getByLabelText("Version")).toHaveValue(__APP_VERSION__);
    const current = __RELEASE_NOTES__.find(
      (release) => release.version === __APP_VERSION__,
    )!;
    expect(within(dialog).getByText(current.sections[0].entries[0])).toBeInTheDocument();
    fireEvent.click(
      within(dialog.querySelector("footer")!).getByRole("button", { name: "Close" }),
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    first.unmount();

    render(<AppFooter userId={userId} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByText(/MIT License/).closest("a")).toBeNull();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("opens the bundled history and lets users select another version", async () => {
    rememberRelease(userId, __APP_VERSION__);
    render(<AppFooter userId={userId} />);
    fireEvent.click(screen.getByRole("button", { name: "Changelog" }));
    const dialog = await screen.findByRole("dialog");
    const previous = __RELEASE_NOTES__.find(
      (release) => release.version !== __APP_VERSION__,
    )!;
    fireEvent.change(within(dialog).getByLabelText("Version"), {
      target: { value: previous.version },
    });
    expect(within(dialog).getByText(previous.sections[0].entries[0])).toBeInTheDocument();
    fireEvent.click(
      within(dialog.querySelector("footer")!).getByRole("button", { name: "Close" }),
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Changelog" }));
    expect(screen.getByLabelText("Version")).toHaveValue(__APP_VERSION__);
  });

  it("keeps the app usable when local storage is unavailable", async () => {
    const read = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("Storage disabled", "SecurityError");
    });
    const write = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Storage disabled", "SecurityError");
    });
    try {
      render(<AppFooter userId={userId} />);
      const dialog = await screen.findByRole("dialog");
      fireEvent.click(
        within(dialog.querySelector("footer")!).getByRole("button", { name: "Close" }),
      );
      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
      expect(screen.getByRole("button", { name: "Changelog" })).toBeEnabled();
    } finally {
      read.mockRestore();
      write.mockRestore();
    }
  });
});

it("does not reannounce after leaving the app while the popup is still open", async () => {
  const first = render(<AppFooter userId="reader-who-closed-the-tab" />);
  expect(await screen.findByRole("dialog")).toBeInTheDocument();
  first.unmount();
  render(<AppFooter userId="reader-who-closed-the-tab" />);
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});
