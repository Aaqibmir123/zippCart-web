"use client";
import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type InputHTMLAttributes,
} from "react";
import { Eye, EyeOff } from "lucide-react";

export function PasswordField({
  label,
  error,
  className = "",
  value,
  defaultValue,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string }) {
  const generatedId = useId();
  const id = props.id ?? generatedId;
  const [visible, setVisible] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  // Keep the browser's value through visibility changes and password-manager
  // autofill. Only an actual parent value change should replace that value.
  useLayoutEffect(() => {
    if (input.current && value !== undefined)
      input.current.value = String(value);
  }, [value]);
  return (
    <div className="text-sm font-medium text-slate-700">
      <label htmlFor={id}>{label}</label>
      <div className="relative">
        <input
          {...props}
          defaultValue={defaultValue ?? value}
          ref={input}
          id={id}
          type={visible ? "text" : "password"}
          aria-label={label}
          aria-invalid={!!error}
          className={className + " pr-14"}
        />
        <button
          type="button"
          disabled={props.disabled}
          aria-label={(visible ? "Hide " : "Show ") + label.toLowerCase()}
          aria-pressed={visible}
          onClick={() => setVisible((previous) => !previous)}
          className="absolute inset-y-0 right-1 mt-2 flex min-h-11 w-11 items-center justify-center rounded-lg text-slate-500 hover:bg-purple-50 hover:text-purple-700 focus-visible:outline-2 focus-visible:outline-purple-500 disabled:opacity-40"
        >
          {visible ? (
            <EyeOff size={19} aria-hidden="true" />
          ) : (
            <Eye size={19} aria-hidden="true" />
          )}
        </button>
      </div>
      {error && <p className="mt-1 text-sm text-rose-700">{error}</p>}
    </div>
  );
}
