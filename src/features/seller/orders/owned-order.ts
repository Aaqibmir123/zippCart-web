import { sellerOrderApi, type SellerOrder } from "./orders-api";
/** The existing API exposes owned lists, not an order-detail endpoint. */
export async function loadOwnedOrder(
  id: string,
  cached: SellerOrder[] = [],
  signal?: AbortSignal,
) {
  if (!/^[a-f\d]{24}$/i.test(id)) throw new Error("Invalid order reference.");
  const match = cached.find((order) => order.id === id);
  if (match) return match;
  const visited = new Set<number>();
  let page: number | null = 1;
  while (page !== null) {
    if (signal?.aborted)
      throw new DOMException("Request cancelled.", "AbortError");
    if (visited.has(page))
      throw new Error("The order list returned an invalid pagination cursor.");
    visited.add(page);
    const response = await sellerOrderApi.list(page, "all");
    const order = response.orders.find((item) => item.id === id);
    if (order) return order;
    page = response.nextPage;
  }
  throw new Error(
    "This order is unavailable to your store. Personal purchases can be viewed in the ZippCart customer app.",
  );
}
