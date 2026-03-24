import type { UserStatus } from '../../types/domain';
import styles from './Badge.module.css';

type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

export function Badge({
  children,
  tone = 'neutral',
}: {
  children: React.ReactNode;
  tone?: Tone;
}) {
  return <span className={`${styles.badge} ${styles[tone]}`}>{children}</span>;
}

const statusTone: Record<UserStatus, Tone> = {
  ACTIVE: 'success',
  BLOCKED: 'danger',
  DISABLED: 'warning',
};

export function StatusBadge({ status }: { status: UserStatus }) {
  return <Badge tone={statusTone[status]}>{status}</Badge>;
}
