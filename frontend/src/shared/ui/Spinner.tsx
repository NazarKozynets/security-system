import styles from './Spinner.module.css';

export function Spinner({ inline }: { inline?: boolean }) {
  return (
    <div className={`${styles.wrap} ${inline ? styles.inline : ''}`}>
      <div className={styles.spinner} aria-hidden />
    </div>
  );
}
