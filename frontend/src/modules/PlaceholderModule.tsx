import { useNavigate } from 'react-router-dom'
import { ChevronLeft, LucideIcon } from 'lucide-react'
import { useAuthStore } from '../store/auth'
import opexLogo from '../logo/Opex.png'

interface Props {
  nombre: string
  descripcion: string
  Icon: LucideIcon
  color: string
}

export default function PlaceholderModule({ nombre, descripcion, Icon, color }: Props) {
  const navigate = useNavigate()
  const user     = useAuthStore(s => s.user)

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-100 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={opexLogo} alt="OPEX" className="h-8 object-contain" />
          <span className="text-slate-400 text-xs font-medium">{nombre}</span>
        </div>
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 text-sm transition-colors"
        >
          <ChevronLeft size={16} />
          Módulos
        </button>
      </header>

      <main className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-sm">
          <div className={`w-16 h-16 ${color} rounded-2xl flex items-center justify-center mx-auto mb-5`}>
            <Icon size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">{nombre}</h1>
          <p className="text-slate-500 mt-2 text-sm leading-relaxed">{descripcion}</p>
          <div className="mt-6 inline-block bg-amber-100 text-amber-700 text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full">
            En desarrollo
          </div>
          <p className="text-slate-400 text-xs mt-4">
            Hola {user?.nombre?.split(' ')[0]} — este módulo estará disponible próximamente.
          </p>
        </div>
      </main>
    </div>
  )
}
