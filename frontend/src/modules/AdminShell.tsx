import { Routes, Route } from 'react-router-dom'
import { Users, CloudUpload, HardHat } from 'lucide-react'
import ModuleSidebar from '../components/ModuleSidebar'
import UsersPage from '../pages/Users'
import BackupPage from '../pages/Backup'
import EngineeringRoles from '../pages/EngineeringRoles'

const CONFIG = {
  id: 'admin',
  nombre: 'Administración',
  iconBg: 'bg-slate-800',
  nav: [
    { to: 'usuarios',   label: 'Usuarios',   icon: Users },
    { to: 'ingenieria', label: 'Ingeniería',  icon: HardHat },
    { to: 'backup',     label: 'Backup',      icon: CloudUpload },
  ],
}

export default function AdminShell() {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <ModuleSidebar config={CONFIG} />
      <main className="flex-1 overflow-auto">
        <Routes>
          <Route index element={<UsersPage />} />
          <Route path="usuarios"   element={<UsersPage />} />
          <Route path="ingenieria" element={<EngineeringRoles />} />
          <Route path="backup"     element={<BackupPage />} />
        </Routes>
      </main>
    </div>
  )
}
