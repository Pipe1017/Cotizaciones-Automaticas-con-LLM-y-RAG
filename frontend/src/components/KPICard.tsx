import clsx from 'clsx'

interface Props {
  label: string
  value: string | number
  sub?: string
  icon: React.ElementType
  color: string
  trend?: { value: number; label: string }
}

export default function KPICard({ label, value, sub, icon: Icon, color, trend }: Props) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        </div>
        <div className={clsx('p-2.5 rounded-xl', color)}>
          <Icon size={22} className="text-white" />
        </div>
      </div>
      {trend && (
        <div className="mt-3 pt-3 border-t border-gray-50">
          <span className={clsx('text-xs font-medium', trend.value >= 0 ? 'text-emerald-600' : 'text-red-500')}>
            {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}%
          </span>
          <span className="text-xs text-gray-400 ml-1">{trend.label}</span>
        </div>
      )}
    </div>
  )
}
