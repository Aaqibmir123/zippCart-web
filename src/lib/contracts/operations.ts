export const operationsOptions = [
  { key: "new", label: "Confirmed", color: "#315FD3", bg: "#EAF0FF" },
  { key: "preparing", label: "Processing", color: "#AB690B", bg: "#FFF3D9" },
  { key: "dispatched", label: "Dispatched", color: "#7139F5", bg: "#F0E7FF" },
  { key: "delivered", label: "Delivered", color: "#187A53", bg: "#E3F6ED" },
  {
    key: "return_window",
    label: "24-hour window",
    color: "#8A5A0A",
    bg: "#FFF5E3",
  },
  { key: "returns", label: "Returns", color: "#AE3775", bg: "#FCE8F2" },
  { key: "exchanges", label: "Exchanges", color: "#087D91", bg: "#E0F5FA" },
  { key: "cancelled", label: "Cancelled", color: "#AE414B", bg: "#FBEAED" },
] as const;
export type Operations = {
  stage: "new" | "preparing" | "dispatched" | "delivered" | "cancelled";
  support: ("return" | "exchange")[];
};
export const groupOptions = [
  { key: "all", label: "All", color: "#493064", bg: "#EBE3F5" },
  { key: "active", label: "Active", color: "#30597A", bg: "#EAF3F9" },
  { key: "history", label: "History", color: "#5C6374", bg: "#ECEEF3" },
] as const;
export type OperationsQueue =
  | (typeof operationsOptions)[number]["key"]
  | (typeof groupOptions)[number]["key"];
export function operationsTone(operations: Operations) {
  const key = operations.support.includes("exchange")
    ? "exchanges"
    : operations.support.includes("return")
      ? "returns"
      : operations.stage;
  return operationsOptions.find((item) => item.key === key)!;
}
