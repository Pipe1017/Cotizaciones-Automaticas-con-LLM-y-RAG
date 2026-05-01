import { NavLink, useNavigate } from 'react-router-dom'
import { LogOut, ChevronLeft, LucideIcon } from 'lucide-react'
import clsx from 'clsx'
import opexLogo from '../logo/Opex.png'
import { useAuthStore } from '../store/auth'

export interface ModuleNav {
  to: string
  label: string
  icon: LucideIcon
}

export interface ModuleConfig {
  id: string
  nombre: string
  iconBg: string
  nav: ModuleNav[]
}

export default function ModuleSidebar({ config }: { config: ModuleConfig }) {
  const user     = useAuthStore(s => s.user)
  const logout   = useAuthStore(s => s.logout)
  const navigate = useNavigate()

  return (
    <aside className="w-56 bg-brand-900 text-white flex flex-col shrink-0 h-screen sticky top-0">
      {/* Logo + módulo */}
      <div className="px-4 pt-5 pb-4 border-b border-white/10">
        <div className="bg-white rounded-lg p-2 w-full flex items-center justify-center mb-3">
          <img src={opexLogo} alt="OPEX SAS" className="h-7 object-contain" />
        </div>
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-1.5 text-white/40 hover:text-white/80 text-[10px] uppercase tracking-widest font-bold transition-colors mb-2"
        >
          <ChevronLeft size={12} />
          Módulos
        </button>
        <p className="text-white/90 text-xs font-semibold truncate">{config.nombre}</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-2 space-y-0.5 overflow-y-auto">
        {config.nav.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '.' || to === ''}
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
            onClick={() => { logout(); navigate('/login', { replace: true }) }}
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
