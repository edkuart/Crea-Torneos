// RSC — no "use client" needed
import type {
  InputHTMLAttributes,
  TextareaHTMLAttributes,
  SelectHTMLAttributes,
  ReactNode,
} from "react";

const fieldBase = "w-full rounded-md outline-none transition";
const lightField =
  "min-h-14 border border-border bg-white px-4 text-lg text-ink " +
  "focus:border-brand focus:ring-4 focus:ring-brand/15";
const darkField =
  "min-h-12 border border-white/20 bg-white px-3 text-lg font-bold text-ink " +
  "focus:ring-4 focus:ring-warning-strong/30";

function fieldClass(isDark?: boolean, extra = "") {
  return [fieldBase, isDark ? darkField : lightField, extra].filter(Boolean).join(" ");
}

type FrameProps = {
  label?: string;
  hint?: string;
  error?: string;
  dark?: boolean;
  children: ReactNode;
};

function Frame({ label, hint, error, dark, children }: FrameProps) {
  return (
    <label className={`grid gap-2 text-base font-bold${dark ? " text-stone-100" : ""}`}>
      {label}
      {children}
      {hint && !error && (
        <span className={`text-sm font-normal ${dark ? "text-stone-400" : "text-stone-600"}`}>
          {hint}
        </span>
      )}
      {error && (
        <span className="text-sm font-bold text-red-700" role="alert">
          {error}
        </span>
      )}
    </label>
  );
}

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  hint?: string;
  error?: string;
  dark?: boolean;
};
export function Input({ label, hint, error, dark, className = "", ...props }: InputProps) {
  return (
    <Frame label={label} hint={hint} error={error} dark={dark}>
      <input
        className={fieldClass(dark, className)}
        aria-invalid={error ? true : undefined}
        {...props}
      />
    </Frame>
  );
}

type AreaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  hint?: string;
  error?: string;
  dark?: boolean;
};
export function Textarea({ label, hint, error, dark, className = "", ...props }: AreaProps) {
  return (
    <Frame label={label} hint={hint} error={error} dark={dark}>
      <textarea
        className={fieldClass(dark, "py-3 leading-7 " + className)}
        aria-invalid={error ? true : undefined}
        {...props}
      />
    </Frame>
  );
}

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  hint?: string;
  error?: string;
  dark?: boolean;
  children: ReactNode;
};
export function Select({
  label,
  hint,
  error,
  dark,
  className = "",
  children,
  ...props
}: SelectProps) {
  return (
    <Frame label={label} hint={hint} error={error} dark={dark}>
      <select className={fieldClass(dark, className)} {...props}>
        {children}
      </select>
    </Frame>
  );
}
