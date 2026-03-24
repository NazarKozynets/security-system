import { Card } from './Card';

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <Card compact>
      <p style={{ margin: 0, fontWeight: 600, color: 'var(--color-text)' }}>{title}</p>
      {description ? (
        <p style={{ margin: '8px 0 0', fontSize: 14 }}>{description}</p>
      ) : null}
    </Card>
  );
}
