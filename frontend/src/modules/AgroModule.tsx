import { Routes, Route } from 'react-router-dom'
import { LayoutDashboard, Layers, Building2, TrendingUp } from 'lucide-react'
import ModuleSidebar from '../components/ModuleSidebar'
import AgroDashboard from '../pages/agro/AgroDashboard'
import Leads from '../pages/Leads'
import Companies from '../pages/Companies'
import Pipeline from '../pages/Pipeline'

const CONFIG = {
  id: 'agro',
  nombre: 'Agro-Proyectos',
  iconBg: 'bg-emerald-700',
  nav: [
    { to: '',         label: 'Dashboard', icon: LayoutDashboard },
    { to: 'leads',    label: 'Leads',     icon: Layers },
    { to: 'empresas', label: 'Empresas',  icon: Building2 },
    { to: 'pipeline', label: 'Pipeline',  icon: TrendingUp },
  ],
}

export default function AgroModule() {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <ModuleSidebar config={CONFIG} />
      <main className="flex-1 overflow-auto">
        <Routes>
          <Route index element={<AgroDashboard />} />
          <Route path="leads"    element={<Leads />} />
          <Route path="empresas" element={<Companies modulo="agro_proyectos" />} />
          <Route path="pipeline" element={<Pipeline allowedBL={[4]} />} />
        </Routes>
      </main>
    </div>
  )
}

function AgroPipelinePlaceholder() {
  return (
    <div className="p-8">
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-8 text-center max-w-lg mx-auto mt-12">
        <TrendingUp size={32} className="text-amber-500 mx-auto mb-3" />
        <h2 className="font-bold text-amber-800 text-lg">Pipeline Agro</h2>
        <p className="text-amber-700 text-sm mt-2">
          En construcción. Este módulo tendrá el pipeline específico para proyectos agrícolas.
        </p>
      </div>
    </div>
  )
}
