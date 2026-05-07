import { Routes, Route } from 'react-router-dom'
import { Users } from 'lucide-react'
import ModuleSidebar from '../components/ModuleSidebar'
import UsersPage from '../pages/Users'

const CONFIG = {
  id: 'admin',
  nombre: 'Administración',
  iconBg: 'bg-slate-800',
  nav: [
    { to: 'usuarios', label: 'Usuarios', icon: Users },
  ],
}

export default function AdminShell() {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <ModuleSidebar config={CONFIG} />
      <main className="flex-1 overflow-auto">
        <Routes>
          <Route index element={<UsersPage />} />
          <Route path="usuarios" element={<UsersPage />} />
        </Routes>
      </main>
    </div>
  )
}
