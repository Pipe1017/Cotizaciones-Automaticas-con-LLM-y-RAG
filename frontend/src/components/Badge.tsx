import clsx from 'clsx'

const VARIANTS = {
  gray:    'bg-gray-100 text-gray-600',
  blue:    'bg-blue-100 text-blue-700',
  green:   'bg-emerald-100 text-emerald-700',
  red:     'bg-red-100 text-red-700',
  amber:   'bg-amber-100 text-amber-700',
  purple:  'bg-purple-100 text-purple-700',
  indigo:  'bg-indigo-100 text-indigo-700',
  brand:   'bg-brand-100 text-brand-700',
}

export type BadgeVariant = keyof typeof VARIANTS

interface Props {
  children: React.ReactNode
  variant?: BadgeVariant
  className?: string
}

export default function Badge({ children, variant = 'gray', className }: Props) {
  return (
    <span className={clsx('pill', VARIANTS[variant], className)}>
      {children}
    </span>
  )
}
