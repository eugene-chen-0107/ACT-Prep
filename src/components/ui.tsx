'use client';

import {
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useRef,
} from 'react';
import { AlertCircle, CheckCircle2, Info, LoaderCircle, TriangleAlert, X } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'quiet' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <button className={`ui-button ui-button--${variant} ui-button--${size} ${className}`.trim()} {...props}>{children}</button>;
}

export function Input({
  label,
  hint,
  error,
  id,
  className = '',
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string; error?: string }) {
  const inputId = id ?? props.name ?? label.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;
  return (
    <div className="ui-field">
      <label className="ui-label" htmlFor={inputId}>{label}</label>
      <input id={inputId} className={`ui-input ${className}`.trim()} aria-invalid={error ? true : undefined} aria-describedby={describedBy} {...props} />
      {hint && <span id={hintId} className="ui-field-hint">{hint}</span>}
      {error && <span id={errorId} className="ui-field-error">{error}</span>}
    </div>
  );
}

export type SelectOption = { label: string; value: string };
export function Dropdown({
  label,
  options,
  id,
  className = '',
  ...props
}: Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'children'> & { label: string; options: SelectOption[] }) {
  const selectId = id ?? props.name ?? label.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return (
    <div className="ui-field">
      <label className="ui-label" htmlFor={selectId}>{label}</label>
      <select id={selectId} className={`ui-select ${className}`.trim()} {...props}>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </div>
  );
}

export function Card({ children, className = '', padded = false }: { children: ReactNode; className?: string; padded?: boolean }) {
  return <section className={`ui-card${padded ? ' ui-card--padded' : ''} ${className}`.trim()}>{children}</section>;
}
export function CardHeading({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return <div className="flex items-start justify-between gap-4"><div><h3 className="ui-card-title">{title}</h3>{description && <p className="ui-card-description">{description}</p>}</div>{action}</div>;
}

export type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';
export function Badge({ tone = 'neutral', children }: { tone?: BadgeTone; children: ReactNode }) {
  return <span className={`ui-badge ui-badge--${tone}`}>{children}</span>;
}

export type TabItem = { id: string; label: string; disabled?: boolean };
export function Tabs({
  items,
  value,
  onValueChange,
  label,
}: {
  items: TabItem[];
  value: string;
  onValueChange: (value: string) => void;
  label: string;
}) {
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const available = items.filter((item) => !item.disabled);
    const currentIndex = available.findIndex((item) => item.id === value);
    const nextIndex = event.key === 'Home' ? 0 : event.key === 'End' ? available.length - 1 : (currentIndex + (event.key === 'ArrowRight' ? 1 : -1) + available.length) % available.length;
    const next = available[nextIndex];
    if (next) {
      onValueChange(next.id);
      event.currentTarget.querySelector<HTMLButtonElement>(`[data-tab="${next.id}"]`)?.focus();
    }
  };
  return (
    <div className="ui-tabs" role="tablist" aria-label={label} onKeyDown={onKeyDown}>
      {items.map((item) => <button key={item.id} type="button" role="tab" data-tab={item.id} id={`${label.replace(/\s+/g, '-')}-${item.id}-tab`} aria-selected={value === item.id} aria-controls={`${label.replace(/\s+/g, '-')}-panel`} tabIndex={value === item.id ? 0 : -1} disabled={item.disabled} className="ui-tab" onClick={() => onValueChange(item.id)}>{item.label}</button>)}
    </div>
  );
}

export function ProgressBar({ value, max = 100, label, showValue = true }: { value: number; max?: number; label: string; showValue?: boolean }) {
  const safeMax = Math.max(1, max);
  const percentage = Math.max(0, Math.min(100, (value / safeMax) * 100));
  return (
    <div className="ui-progress">
      <div className="ui-progress__meta"><span className="ui-progress__label">{label}</span>{showValue && <span>{Math.round(percentage)}%</span>}</div>
      <div className="ui-progress__track" role="progressbar" aria-label={label} aria-valuenow={Math.min(value, safeMax)} aria-valuemin={0} aria-valuemax={safeMax}>
        <div className="ui-progress__fill" style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}

const alertIcons = { success: CheckCircle2, warning: TriangleAlert, danger: AlertCircle, info: Info };
export function Alert({ tone = 'info', title, children }: { tone?: Exclude<BadgeTone, 'neutral'>; title?: string; children: ReactNode }) {
  const Icon = alertIcons[tone];
  return <div className={`ui-alert ui-alert--${tone}`} role={tone === 'danger' ? 'alert' : 'status'}><Icon size={16} aria-hidden="true" className="mt-0.5 shrink-0" /><div>{title && <p className="ui-alert__title">{title}</p>}<p className="ui-alert__message">{children}</p></div></div>;
}

export function Tooltip({ label, children }: { label: string; children: ReactNode }) {
  return <span className="ui-tooltip"><span className="ui-tooltip__trigger" tabIndex={0} aria-label={label}>{children}</span><span className="ui-tooltip__content" role="tooltip">{label}</span></span>;
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    closeButtonRef.current?.focus();
    const onKeyDown = (event: globalThis.KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="ui-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="ui-modal" role="dialog" aria-modal="true" aria-labelledby="ui-modal-title" aria-describedby={description ? 'ui-modal-description' : undefined}>
        <header className="ui-modal__header"><div><h2 id="ui-modal-title" className="ui-modal__title">{title}</h2>{description && <p id="ui-modal-description" className="ui-modal__description">{description}</p>}</div><button ref={closeButtonRef} className="ui-icon-button" type="button" onClick={onClose} aria-label="Close dialog"><X size={17} /></button></header>
        <div className="ui-modal__body">{children}</div>
        {footer && <footer className="ui-modal__footer">{footer}</footer>}
      </section>
    </div>
  );
}

export function LoadingState({ label = 'Loading', lines = 3 }: { label?: string; lines?: number }) {
  return <div aria-label={label} role="status" className="grid gap-3"><span className="sr-only">{label}</span><div className="flex items-center gap-2 text-xs font-medium text-muted"><LoaderCircle size={15} className="animate-spin" />{label}</div>{Array.from({ length: lines }, (_, index) => <div key={index} className="ui-skeleton h-3" style={{ width: `${index === lines - 1 ? 48 : index === 1 ? 84 : 100}%` }} />)}</div>;
}

export function EmptyState({ icon, title, description, action }: { icon: ReactNode; title: string; description: string; action?: ReactNode }) {
  return <div className="ui-empty"><span className="ui-empty__icon" aria-hidden="true">{icon}</span><h3 className="ui-empty__title">{title}</h3><p className="ui-empty__description">{description}</p>{action && <div className="mt-4">{action}</div>}</div>;
}
