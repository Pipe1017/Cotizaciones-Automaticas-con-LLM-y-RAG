import { useNavigate } from 'react-router-dom'
import { Zap, Leaf, Droplets, LayoutGrid, LogOut, ChevronRight } from 'lucide-react'
import clsx from 'clsx'
import { useAuthStore } from '../store/auth'
import opexLogo from '../logo/Opex.png'

const MODULES = [
  {
    id: 'energia',
    nombre: 'Energía & Backup',
    descripcion: 'Baterías industriales HOPPECKE, cotizaciones con IA y pipeline de ventas',
    Icon: Zap,
    gradient: 'from-brand-900 to-brand-700',
    border: 'border-brand-200 hover:border-brand-400',
    iconBg: 'bg-brand-900',
    tag: 'Activo',
    tagColor: 'bg-emerald-100 text-emerald-700',
    activo: true,
  },
  {
    id: 'agro',
    nombre: 'Agro-Proyectos',
    descripcion: 'Fertilizantes, leads agrícolas y desarrollo de mercado',
    Icon: Leaf,
    gradient: 'from-emerald-800 to-emerald-600',
    border: 'border-emerald-200 hover:border-emerald-400',
    iconBg: 'bg-emerald-700',
    tag: 'Activo',
    tagColor: 'bg-emerald-100 text-emerald-700',
    activo: true,
  },
  {
    id: 'h2',
    nombre: 'H₂ & Renovables',
    descripcion: 'Hidrógeno verde, celdas de combustible y energías renovables',
    Icon: Droplets,
    gradient: 'from-cyan-800 to-cyan-600',
    border: 'border-cyan-200 hover:border-cyan-300',
    iconBg: 'bg-cyan-700',
    tag: 'En desarrollo',
    tagColor: 'bg-amber-100 text-amber-700',
    activo: false,
  },
  {
    id: 'varios',
    nombre: 'Varios',
    descripcion: 'Proyectos especiales, logística, licitaciones y otros negocios',
    Icon: LayoutGrid,
    gradient: 'from-slate-700 to-slate-500',
    border: 'border-slate-200 hover:border-slate-300',
    iconBg: 'bg-slate-600',
    tag: 'En desarrollo',
    tagColor: 'bg-amber-100 text-amber-700',
    activo: false,
  },
]

export default function ModuleSelector() {
  const navigate  = useNavigate()
  const user      = useAuthStore(s => s.user)
  const logout    = useAuthStore(s => s.logout)

  return (
    <div className="min-h-screen bg-brand-950 flex flex-col">
      {/* Header */}
      <header className="px-8 py-5 flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="bg-white rounded-lg p-2">
            <img src={opexLogo} alt="OPEX SAS" className="h-7 object-contain" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">OPEX SAS</p>
            <p className="text-white/40 text-[10px] uppercase tracking-widest">Plataforma CRM</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-white/80 text-xs font-medium">{user?.nombre}</p>
            <p className={clsx(
              'text-[10px] uppercase font-bold tracking-widest',
              user?.rol === 'editor' ? 'text-accent-400' : 'text-white/40'
            )}>{user?.rol}</p>
          </div>
          <button
            onClick={() => { logout(); navigate('/login', { replace: true }) }}
            className="text-white/30 hover:text-white/70 transition-colors p-2 rounded-lg hover:bg-white/10"
            title="Cerrar sesión"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex flex-col items-center justify-center px-8 py-12">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-white">Selecciona un módulo</h1>
          <p className="text-white/40 mt-2 text-sm">Elige el área de negocio con la que quieres trabajar</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full max-w-3xl">
          {MODULES.map(m => (
            <button
              key={m.id}
              onClick={() => m.activo && navigate(`/${m.id}`)}
              disabled={!m.activo}
              className={clsx(
                'group relative bg-white rounded-2xl border-2 p-6 text-left transition-all duration-200 shadow-sm',
                m.border,
                m.activo
                  ? 'hover:shadow-card-hover hover:-translate-y-0.5 cursor-pointer'
                  : 'opacity-60 cursor-not-allowed'
              )}
            >
              {/* Icon */}
              <div className={clsx('w-11 h-11 rounded-xl flex items-center justify-center mb-4', m.iconBg)}>
                <m.Icon size={20} className="text-white" strokeWidth={2} />
              </div>

              {/* Content */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h2 className="font-bold text-slate-800 text-base leading-tight">{m.nombre}</h2>
                  <p className="text-slate-500 text-xs mt-1.5 leading-relaxed">{m.descripcion}</p>
                </div>
                {m.activo && (
                  <ChevronRight size={18} className="text-slate-300 group-hover:text-slate-500 transition-colors shrink-0 mt-0.5" />
                )}
              </div>

              {/* Tag */}
              <span className={clsx('inline-block mt-4 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full', m.tagColor)}>
                {m.tag}
              </span>
            </button>
          ))}
        </div>
      </main>

      <footer className="py-4 text-center text-white/20 text-[10px]">
        By Aura Gallego ft. Claude Code
      </footer>
    </div>
  )
}
