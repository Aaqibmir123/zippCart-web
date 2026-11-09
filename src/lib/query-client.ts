import { QueryClient } from "@tanstack/react-query";
import { isApiError } from "./api/api-error";

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 15000,
        refetchOnWindowFocus: true,
        refetchIntervalInBackground: false,
        retry: (count, error) =>
          count < 1 &&
          !(
            isApiError(error) &&
            ([
              "cancelled",
              "invalid_response",
              "invalid_request",
              "configuration",
            ].includes(error.kind ?? "") ||
              (error.status !== undefined && error.status < 500))
          ),
      },
      mutations: { retry: false },
    },
  });
}
