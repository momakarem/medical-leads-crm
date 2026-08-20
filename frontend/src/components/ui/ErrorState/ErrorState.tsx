export function ErrorState({ message = 'Something went wrong.' }: { message?: string }) {
  return (
    <div className="state-card state-card--error" role="alert">
      <div className="state-icon">!</div>
      <strong>{message}</strong>
    </div>
  );
}
