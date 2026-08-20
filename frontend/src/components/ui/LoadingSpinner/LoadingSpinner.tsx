export function LoadingSpinner({ label = 'Loading...' }: { label?: string }) {
  return (
    <div className="loading-spinner" role="status">
      <span className="spinner-ring" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
