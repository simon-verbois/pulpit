import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { expect, it } from "vitest";
import { server } from "../../test/mswServer";
import { contentSizeKeys } from "../client/contentSizes";
import { useTrackedTask } from "./useTrackedTask";

it("refreshes derived sizes when a Pulp task completes", async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(contentSizeKeys.components, [{ size_bytes: 10 }]);
  server.use(
    http.get("/pulp/api/v3/tasks/size-test/", () =>
      HttpResponse.json({ state: "completed" }),
    ),
  );
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const { result } = renderHook(
    () => {
      useTrackedTask({ href: "/pulp/api/v3/tasks/size-test/" });
      return useQuery({
        queryKey: contentSizeKeys.components,
        queryFn: async () => [{ size_bytes: 20 }],
        staleTime: Infinity,
      });
    },
    { wrapper },
  );
  await waitFor(() => expect(result.current.data).toEqual([{ size_bytes: 20 }]));
});
