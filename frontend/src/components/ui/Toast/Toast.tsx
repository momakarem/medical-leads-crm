export function Toast({ message, tone = 'success' }: { message: string; tone?: 'success' | 'error' | 'info' }) {
  return <div className={`toast toast--${tone}`}>{message}</div>;
}
