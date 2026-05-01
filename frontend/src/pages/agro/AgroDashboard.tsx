import { Leaf, TrendingUp, Users, Sprout } from 'lucide-react'
import PageHeader from '../../components/PageHeader'

export default function AgroDashboard() {
  return (
    <div className="p-8 space-y-6">
      <PageHeader
        title="Agro-Proyectos"
        subtitle="Dashboard de fertilizantes y desarrollo de mercado agrícola"
      />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Leads activos',     icon: Sprout,     color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Empresas agro',     icon: Users,      color: 'text-teal-600',    bg: 'bg-teal-50' },
          { label: 'Pipeline en curso', icon: TrendingUp, color: 'text-green-600',   bg: 'bg-green-50' },
        ].map(({ label, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white rounded-xl border border-slate-100 p-5 flex items-center gap-4">
            <div className={`${bg} p-3 rounded-xl`}>
              <Icon size={22} className={color} />
            </div>
            <div>
              <p className="text-slate-500 text-xs">{label}</p>
              <p className="text-slate-800 font-bold text-xl">—</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 flex items-start gap-4">
        <Leaf size={24} className="text-emerald-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-emerald-800">Módulo Agro-Proyectos</p>
          <p className="text-emerald-700 text-sm mt-1">
            Gestiona tus leads de fertilizantes, empresas del sector agrícola y el pipeline de proyectos agro.
            El pipeline completo está en construcción — por ahora puedes gestionar los leads desde el menú lateral.
          </p>
        </div>
      </div>
    </div>
  )
}
