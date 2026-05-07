import { Routes, Route } from 'react-router-dom'
import { LayoutDashboard, TrendingUp, Building2, Package } from 'lucide-react'
import ModuleSidebar from '../components/ModuleSidebar'
import Dashboard from '../pages/Dashboard'
import Pipeline from '../pages/Pipeline'
import Companies from '../pages/Companies'
import Products from '../pages/Products'

const CONFIG = {
  id: 'energia',
  nombre: 'Energía & Backup',
  iconBg: 'bg-brand-900',
  nav: [
    { to: '',         label: 'Dashboard', icon: LayoutDashboard },
    { to: 'pipeline', label: 'Pipeline',  icon: TrendingUp },
    { to: 'empresas', label: 'Empresas',  icon: Building2 },
    { to: 'catalogo', label: 'Catálogo',  icon: Package },
  ],
}

export default function EnergiaModule() {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <ModuleSidebar config={CONFIG} />
      <main className="flex-1 overflow-auto">
        <Routes>
          <Route index element={<Dashboard allowedBL={[1, 2, 3]} />} />
          <Route path="pipeline" element={<Pipeline allowedBL={[1, 2, 3]} />} />
          <Route path="empresas" element={<Companies modulo="energia_backup" />} />
          <Route path="catalogo" element={<Products allowedBL={[1, 2, 3]} />} />
        </Routes>
      </main>
    </div>
  )
}
