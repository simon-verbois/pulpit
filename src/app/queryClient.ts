import { QueryClient } from "@tanstack/react-query";

// Defaults tuned for an admin console over a REST API that can be briefly
// unavailable (Pulp mid-restart/migration) rather than a public consumer app:
// don't retry auth/permission failures, do retry transient network/backend
// failures a small number of times.
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: (failureCount, error) => {
          const status = (error as { status?: number } | undefined)?.status;
          if (status === 401 || status === 403 || status === 404) {
            return false;
          }
          return failureCount < 2;
        },
        refetchOnWindowFocus: false,
        staleTime: 15_000,
      },
    },
  });
}
