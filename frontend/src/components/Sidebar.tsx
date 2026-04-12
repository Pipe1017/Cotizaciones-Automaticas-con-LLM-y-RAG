import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Building2, TrendingUp, Package,
  FileText, Leaf,
} from 'lucide-react'
import clsx from 'clsx'
import opexLogo from '../logo/Opex.png'

const NAV = [
  { to: '/',            label: 'Dashboard',    icon: LayoutDashboard },
  { to: '/pipeline',   label: 'Pipeline',      icon: TrendingUp },
  { to: '/quotations', label: 'Cotizaciones',  icon: FileText },
  { to: '/companies',  label: 'Empresas',      icon: Building2 },
  { to: '/products',   label: 'Catálogo',      icon: Package },
  { to: '/leads',      label: 'Fertilizantes', icon: Leaf },
]

export default function Sidebar() {
  return (
    <aside className="w-56 bg-brand-900 text-white flex flex-col shrink-0 h-screen sticky top-0">
      {/* Logo area */}
      <div className="px-4 pt-6 pb-5 border-b border-white/10 flex flex-col items-center gap-2">
        <div className="bg-white rounded-lg p-2 w-full flex items-center justify-center">
          <img src={opexLogo} alt="OPEX SAS" className="h-8 object-contain" />
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-white/60 text-[10px] font-bold uppercase tracking-widest">CRM</span>
          <span className="w-1 h-1 rounded-full bg-accent-500" />
          <span className="text-white/40 text-[10px] uppercase tracking-widest">v1.1</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-0.5 overflow-y-auto">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-brand-500 text-white shadow-sm'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              )
            }
          >
            <Icon size={17} strokeWidth={2} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-white/50 text-xs">Sistema activo</span>
        </div>
      </div>
    </aside>
  )
}
