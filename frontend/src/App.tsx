import { Route, Routes } from 'react-router-dom'
import { Droplets, LayoutGrid } from 'lucide-react'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import ModuleSelector from './pages/ModuleSelector'
import EnergiaModule from './modules/EnergiaModule'
import AgroModule from './modules/AgroModule'
import PlaceholderModule from './modules/PlaceholderModule'
import AdminShell from './modules/AdminShell'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/*" element={
        <ProtectedRoute>
          <Routes>
            <Route index element={<ModuleSelector />} />
            <Route path="energia/*" element={<EnergiaModule />} />
            <Route path="agro/*"    element={<AgroModule />} />
            <Route path="admin/*"   element={<AdminShell />} />
            <Route path="h2/*"      element={
              <PlaceholderModule
                nombre="H₂ & Renovables"
                descripcion="Hidrógeno verde, celdas de combustible PEM y energías renovables"
                Icon={Droplets}
                color="bg-cyan-700"
              />
            } />
            <Route path="varios/*"  element={
              <PlaceholderModule
                nombre="Varios"
                descripcion="Proyectos especiales, logística, licitaciones y otros negocios"
                Icon={LayoutGrid}
                color="bg-slate-600"
              />
            } />
          </Routes>
        </ProtectedRoute>
      } />
    </Routes>
  )
}
