import type { InputHTMLAttributes } from 'react';
import styles from './Input.module.css';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export function Input({ label, error, id, className = '', ...rest }: InputProps) {
  const inputId = id ?? rest.name;
  return (
    <div className={styles.wrap}>
      <label htmlFor={inputId} className={styles.label}>
        {label}
      </label>
      <input id={inputId} className={`${styles.field} ${className}`} {...rest} />
      {error ? <span className={styles.error}>{error}</span> : null}
    </div>
  );
}
