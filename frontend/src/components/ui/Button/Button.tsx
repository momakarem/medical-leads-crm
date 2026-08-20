import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  isLoading?: boolean;
  children: ReactNode;
}

export function Button({ variant = 'secondary', isLoading = false, children, className = '', disabled, ...props }: ButtonProps) {
  return (
    <button className={`ui-button ui-button--${variant} ${className}`} disabled={disabled || isLoading} {...props}>
      {isLoading ? <span className="spinner-dot" aria-hidden="true" /> : null}
      <span>{children}</span>
    </button>
  );
}
