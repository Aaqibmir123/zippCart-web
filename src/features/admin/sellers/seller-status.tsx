export const accountLabels = {
  change_required: "First password change required",
  ready: "Password ready",
  password_not_set: "Password not configured",
};
export const onboardingLabels = {
  not_started: "Not started",
  pending: "Pending review",
  approved: "Approved",
  rejected: "Changes requested",
};
export function SellerStatus({
  status,
  children,
}: {
  status: string;
  children: React.ReactNode;
}) {
  const color =
    status === "ready" || status === "approved"
      ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
      : status === "rejected"
        ? "bg-rose-50 text-rose-800 ring-rose-200"
        : status === "not_started" || status === "password_not_set"
          ? "bg-slate-50 text-slate-700 ring-slate-200"
          : "bg-amber-50 text-amber-900 ring-amber-200";
  return (
    <span
      className={
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset " +
        color
      }
    >
      <span
        className="h-1.5 w-1.5 rounded-full bg-current"
        aria-hidden="true"
      />
      {children}
    </span>
  );
}
