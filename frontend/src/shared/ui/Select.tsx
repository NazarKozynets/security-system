import type { SelectHTMLAttributes } from 'react';
import styles from './Select.module.css';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
}

export function Select({ label, id, children, ...rest }: SelectProps) {
  const selectId = id ?? rest.name;
  return (
    <div className={styles.wrap}>
      <label htmlFor={selectId} className={styles.label}>
        {label}
      </label>
      <select id={selectId} className={styles.field} {...rest}>
        {children}
      </select>
    </div>
  );
}
