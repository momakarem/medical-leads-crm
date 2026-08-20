export function EmptyState({ title = 'No data found.', description }: { title?: string; description?: string }) {
  return (
    <div className="state-card state-card--empty">
      <div className="state-icon">∅</div>
      <strong>{title}</strong>
      {description ? <p>{description}</p> : null}
    </div>
  );
}
