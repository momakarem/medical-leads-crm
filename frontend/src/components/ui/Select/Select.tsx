import type { SelectHTMLAttributes } from 'react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}

export function Select({ label, error, id, className = '', children, ...props }: SelectProps) {
  const inputId = id ?? props.name;
  return (
    <label className={`form-control ${className}`} htmlFor={inputId}>
      {label ? <span>{label}</span> : null}
      <select id={inputId} aria-invalid={Boolean(error)} {...props}>{children}</select>
      {error ? <small className="field-error">{error}</small> : null}
    </label>
  );
}
