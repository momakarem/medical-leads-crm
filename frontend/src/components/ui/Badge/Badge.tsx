import type { ReactNode } from 'react';

type BadgeTone = 'neutral' | 'success' | 'danger' | 'warning' | 'info';

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: BadgeTone }) {
  return <span className={`ui-badge ui-badge--${tone}`}>{children}</span>;
}
