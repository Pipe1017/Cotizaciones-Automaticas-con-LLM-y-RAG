import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Building2, TrendingUp, Package,
  FileText, Layers, LogOut,
} from 'lucide-react'
import clsx from 'clsx'
import opexLogo from '../logo/Opex.png'
import { useAuthStore } from '../store/auth'

const NAV = [
  { to: '/',            label: 'Dashboard',    icon: LayoutDashboard },
  { to: '/pipeline',   label: 'Pipeline',      icon: TrendingUp },
  { to: '/quotations', label: 'Cotizaciones',  icon: FileText },
  { to: '/companies',  label: 'Empresas',      icon: Building2 },
  { to: '/products',   label: 'Catálogo',      icon: Package },
  { to: '/leads',      label: 'Fertilizantes', icon: Layers },
]

export default function Sidebar() {
  const user     = useAuthStore(s => s.user)
  const logout   = useAuthStore(s => s.logout)
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

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
          <span className="text-white/40 text-[10px] uppercase tracking-widest">v1.2</span>
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

      {/* Footer — usuario y logout */}
      <div className="px-4 py-4 border-t border-white/10 space-y-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex-1 min-w-0">
            <p className="text-white/85 text-xs font-medium truncate">{user?.nombre}</p>
            <span className={clsx(
              'text-[10px] font-bold uppercase tracking-widest',
              user?.rol === 'editor' ? 'text-accent-400' : 'text-white/40'
            )}>
              {user?.rol}
            </span>
          </div>
          <button
            onClick={handleLogout}
            title="Cerrar sesión"
            className="text-white/40 hover:text-white/80 transition-colors p-1.5 rounded-lg hover:bg-white/10 shrink-0"
          >
            <LogOut size={15} />
          </button>
        </div>
        <p className="text-white/20 text-[9px] leading-tight text-center">
          By Aura Gallego<br />ft. Claude Code
        </p>
      </div>
    </aside>
  )
}
