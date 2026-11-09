import { PasswordField } from "./password-field";
import { LoaderCircle } from "lucide-react";
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  PropsWithChildren,
  ReactNode,
} from "react";

export function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger";
}) {
  const colors = {
    primary: "bg-purple-700 text-white hover:bg-purple-800",
    secondary:
      "border border-purple-200 bg-white text-purple-800 hover:bg-purple-50",
    danger: "bg-rose-700 text-white hover:bg-rose-800",
  };
  return (
    <button
      type="button"
      {...props}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${colors[variant]} ${className}`}
    >
      {children}
    </button>
  );
}
export function Card({
  children,
  className = "",
}: PropsWithChildren<{ className?: string }>) {
  return (
    <section
      className={`rounded-2xl border border-slate-100 bg-white p-5 shadow-sm shadow-slate-900/[0.035] sm:rounded-3xl sm:p-6 ${className}`}
    >
      {children}
    </section>
  );
}
export function Heading({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
          {title}
        </h1>
        {description && (
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            {description}
          </p>
        )}
      </div>
      {actions}
    </header>
  );
}
export const inputClass =
  "mt-2 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-base text-slate-900 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 disabled:bg-slate-50 disabled:text-slate-500";
export function Field({
  label,
  error,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string }) {
  if (props.type === "password")
    return (
      <PasswordField
        {...props}
        label={label}
        error={error}
        className={inputClass}
      />
    );
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <input
        aria-label={label}
        aria-invalid={!!error}
        {...props}
        className={inputClass}
      />
      {error && (
        <span className="mt-1 block text-sm text-rose-700">{error}</span>
      )}
    </label>
  );
}
export function TextArea({
  label,
  value,
  onChange,
  maxLength = 1000,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
  disabled?: boolean;
}) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <textarea
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        maxLength={maxLength}
        disabled={disabled}
        rows={3}
        className={inputClass}
      />
    </label>
  );
}
export function Select({
  label,
  value,
  onChange,
  options,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly (string | { value: string; label: string })[];
  disabled?: boolean;
}) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className={inputClass}
      >
        {options.map((option) =>
          typeof option === "string" ? (
            <option key={option} value={option}>
              {option.replaceAll("_", " ")}
            </option>
          ) : (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ),
        )}
      </select>
    </label>
  );
}
export function Check({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className="flex min-h-11 items-start gap-3 rounded-xl border border-purple-100 bg-purple-50/50 p-3 text-sm leading-6">
      <input
        type="checkbox"
        aria-label={label}
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        disabled={disabled}
        className="mt-1 h-4 w-4 shrink-0 accent-purple-700"
      />
      {label}
    </label>
  );
}
export function Notice({
  children,
  error = false,
}: PropsWithChildren<{ error?: boolean }>) {
  return (
    <p
      role={error ? "alert" : "status"}
      className={`rounded-xl p-4 text-sm leading-6 ${error ? "bg-rose-50 text-rose-800" : "bg-purple-50 text-purple-900"}`}
    >
      {children}
    </p>
  );
}
export function QueryState({
  pending,
  error,
  retry,
  empty,
}: {
  pending?: boolean;
  error?: unknown;
  retry?: () => void;
  empty?: boolean;
}) {
  if (pending)
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex min-h-32 items-center justify-center gap-3 rounded-2xl border border-slate-100 bg-white/80 px-5 py-8 text-sm font-medium text-slate-600"
      >
        <LoaderCircle
          className="animate-spin text-purple-700 motion-reduce:animate-none"
          size={19}
          aria-hidden="true"
        />
        Loading...
      </div>
    );
  if (error)
    return (
      <div className="space-y-3">
        <Notice error>
          {error instanceof Error
            ? error.message
            : "Could not load this information."}
        </Notice>
        {retry && (
          <Button variant="secondary" onClick={retry}>
            Try again
          </Button>
        )}
      </div>
    );
  if (empty)
    return (
      <p className="py-8 text-sm text-slate-500">
        No records match these filters.
      </p>
    );
  return null;
}
export function Badge({ children }: PropsWithChildren) {
  return (
    <span className="inline-flex rounded-full bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-800">
      {children}
    </span>
  );
}
export function Details({ values }: { values: Record<string, ReactNode> }) {
  return (
    <dl className="grid gap-4 sm:grid-cols-2">
      {Object.entries(values).map(([label, value]) => (
        <div key={label} className="min-w-0">
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {label}
          </dt>
          <dd className="mt-1 break-words text-sm leading-6 text-slate-800">
            {value ?? "—"}
          </dd>
        </div>
      ))}
    </dl>
  );
}
export function Pagination({
  page,
  hasMore,
  busy,
  onPage,
}: {
  page: number;
  hasMore: boolean;
  busy?: boolean;
  onPage: (page: number) => void;
}) {
  return (
    <nav
      aria-label="Pagination"
      className="mt-6 flex items-center justify-between gap-3"
    >
      <Button
        variant="secondary"
        disabled={page <= 1 || busy}
        onClick={() => onPage(page - 1)}
      >
        Previous
      </Button>
      <span className="text-sm">Page {page}</span>
      <Button
        variant="secondary"
        disabled={!hasMore || busy}
        onClick={() => onPage(page + 1)}
      >
        Next
      </Button>
    </nav>
  );
}
