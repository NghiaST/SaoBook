// src/components/ui/index.tsx
import { forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from 'react'
import { cn, getInitials } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

// ── Button ────────────────────────────────────────────────────────────────────

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'outline' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, children, className, disabled, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'btn',
        variant === 'primary' && 'btn-primary',
        variant === 'ghost'   && 'btn-ghost',
        variant === 'outline' && 'btn-outline',
        variant === 'danger'  && 'btn bg-red-600 text-white hover:bg-red-700',
        size === 'sm' && 'text-xs px-3 py-1.5',
        size === 'lg' && 'text-base px-6 py-3',
        className,
      )}
      {...props}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  ),
)
Button.displayName = 'Button'

// ── Input ─────────────────────────────────────────────────────────────────────

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, id, ...props }, ref) => (
    <div className="w-full">
      {label && <label htmlFor={id} className="label">{label}</label>}
      <input
        ref={ref}
        id={id}
        className={cn('input', error && 'border-red-500 focus:ring-red-300', className)}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  ),
)
Input.displayName = 'Input'

// ── Textarea ──────────────────────────────────────────────────────────────────

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className, id, ...props }, ref) => (
    <div className="w-full">
      {label && <label htmlFor={id} className="label">{label}</label>}
      <textarea
        ref={ref}
        id={id}
        className={cn('input resize-none', error && 'border-red-500', className)}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  ),
)
Textarea.displayName = 'Textarea'

// ── Avatar ────────────────────────────────────────────────────────────────────

interface AvatarProps { name: string; src?: string; size?: 'sm' | 'md' | 'lg'; className?: string }

export function Avatar({ name, src, size = 'md', className }: AvatarProps) {
  const sizes = { sm: 'w-7 h-7 text-xs', md: 'w-9 h-9 text-sm', lg: 'w-14 h-14 text-lg' }
  return src ? (
    <img
      src={src}
      alt={name}
      className={cn('rounded-full object-cover ring-2 ring-[var(--border)]', sizes[size], className)}
    />
  ) : (
    <div className={cn(
      'rounded-full bg-ink-200 dark:bg-ink-700 flex items-center justify-center font-ui font-semibold text-ink-700 dark:text-ink-200',
      sizes[size], className,
    )}>
      {getInitials(name)}
    </div>
  )
}

// ── Star Rating ───────────────────────────────────────────────────────────────

interface StarRatingProps { value: number; max?: number; onChange?: (v: number) => void; size?: number }

export function StarRating({ value, max = 5, onChange, size = 20 }: StarRatingProps) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }, (_, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onChange?.(i + 1)}
          className={cn(
            'transition-colors',
            onChange ? 'cursor-pointer hover:scale-110' : 'cursor-default',
          )}
          aria-label={`${i + 1} sao`}
        >
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <polygon
              points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
              fill={i < value ? 'var(--accent)' : 'var(--border)'}
              stroke={i < value ? 'var(--accent)' : 'var(--border)'}
              strokeWidth="1.5"
            />
          </svg>
        </button>
      ))}
    </div>
  )
}

// ── Spinner ───────────────────────────────────────────────────────────────────

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('animate-spin text-accent', className ?? 'w-6 h-6')} />
}

// ── Modal ─────────────────────────────────────────────────────────────────────

interface ModalProps { open: boolean; onClose: () => void; title?: string; children: ReactNode }

export function Modal({ open, onClose, title, children }: ModalProps) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative card w-full max-w-lg p-6 z-10 animate-in fade-in zoom-in-95 duration-200">
        {title && (
          <h2 className="font-display text-xl font-semibold text-[var(--text)] mb-4">{title}</h2>
        )}
        {children}
      </div>
    </div>
  )
}

// ── Badge ─────────────────────────────────────────────────────────────────────

export function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium font-ui',
      'bg-[var(--bg-alt)] text-[var(--text-muted)] border border-[var(--border)]',
      className,
    )}>
      {children}
    </span>
  )
}

// ── Empty State ───────────────────────────────────────────────────────────────

export function EmptyState({ icon, title, description }: {
  icon?: ReactNode; title: string; description?: string
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {icon && <div className="mb-4 text-[var(--text-subtle)]">{icon}</div>}
      <h3 className="font-display text-lg font-medium text-[var(--text-muted)]">{title}</h3>
      {description && <p className="mt-1 text-sm text-[var(--text-subtle)]">{description}</p>}
    </div>
  )
}
