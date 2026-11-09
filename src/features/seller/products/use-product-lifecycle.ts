import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { productApi } from "./product-api";
import { getSessionScope } from "../../../lib/auth/session-scope";

export type ProductAction = "archive" | "restore" | "delete";

export function useProductLifecycle(ownerId?: string) {
  const client = useQueryClient();
  const locked = useRef(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: ProductAction }) =>
      ({
        archive: productApi.archive,
        restore: productApi.restore,
        delete: productApi.remove,
      })[action](id),
    retry: false,
    onSuccess: async (_result, { id }) => {
      client.removeQueries({
        queryKey: ["seller-product", ownerId, id],
        exact: true,
      });
      await Promise.all([
        client.invalidateQueries({ queryKey: ["seller-products", ownerId] }),
        client.invalidateQueries({ queryKey: ["admin-products"] }),
        client.invalidateQueries({ queryKey: ["admin-product"] }),
        client.invalidateQueries({ queryKey: ["inventory-alerts"] }),
      ]);
    },
    onError: async () => {
      await client
        .invalidateQueries({ queryKey: ["seller-products", ownerId] })
        .catch(() => undefined);
    },
  });
  async function run(id: string, action: ProductAction) {
    if (locked.current || !ownerId || getSessionScope().userId !== ownerId)
      return false;
    locked.current = true;
    setPendingId(id);
    try {
      await mutation.mutateAsync({ id, action });
      return true;
    } finally {
      locked.current = false;
      setPendingId(null);
    }
  }
  return { run, pendingId };
}
