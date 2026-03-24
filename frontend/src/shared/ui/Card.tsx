import type { ReactNode } from 'react';
import styles from './Card.module.css';

export function Card({
  children,
  compact,
  className = '',
}: {
  children: ReactNode;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`${styles.card} ${compact ? styles.compact : ''} ${className}`.trim()}
    >
      {children}
    </div>
  );
}
