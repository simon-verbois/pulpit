import { describe, expect, it } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import { ThemeProvider } from "../../app/theme/ThemeContext";
import { LoginPage } from "./LoginPage";

function renderLoginPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <ThemeProvider>
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={["/login"]}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<div>Home page</div>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </ThemeProvider>,
  );
}

function fillAndSubmit(username: string, password: string) {
  fireEvent.change(screen.getByLabelText(/username/i), { target: { value: username } });
  fireEvent.change(screen.getByLabelText(/^password/i), { target: { value: password } });
  fireEvent.click(screen.getByRole("button", { name: /log in/i }));
}

describe("LoginPage", () => {
  it("logs in with valid credentials and navigates to the app", async () => {
    renderLoginPage();

    fillAndSubmit("admin", "correct-password");

    await waitFor(() => expect(screen.getByText("Home page")).toBeInTheDocument());
  });

  it("shows an error for invalid credentials and stays on the login page", async () => {
    renderLoginPage();

    fillAndSubmit("admin", "wrong-password");

    expect(await screen.findByText(/invalid username or password/i)).toBeInTheDocument();
  });
});
