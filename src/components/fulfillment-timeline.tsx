import type { FulfillmentProgress } from "../lib/contracts/fulfillment";
import { fulfillmentLabel } from "../lib/contracts/fulfillment";
import { Card } from "./ui";
export function FulfillmentTimeline({
  order,
}: {
  order: FulfillmentProgress & { status: string };
}) {
  return (
    <Card>
      <h2 className="mb-5 text-lg font-bold">Fulfillment timeline</h2>
      <ol className="space-y-4">
        {order.fulfillmentTimeline?.map((step, index) => (
          <li key={index} className="flex items-start gap-3">
            <span
              aria-hidden
              className={`mt-1 h-3 w-3 shrink-0 rounded-full ${step.state === "upcoming" ? "bg-slate-200" : "bg-purple-600"}`}
            />
            <div>
              <p className="text-sm font-semibold">
                {fulfillmentLabel(step.status)} · {step.state}
              </p>
              {step.at && (
                <p className="mt-1 text-xs text-slate-500">
                  {new Date(step.at).toLocaleString("en-IN")}
                </p>
              )}
            </div>
          </li>
        ))}
      </ol>
    </Card>
  );
}
