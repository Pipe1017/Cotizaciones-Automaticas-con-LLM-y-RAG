import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Shield, Eye, Trash2, KeyRound, UserCheck } from 'lucide-react'
import api from '../lib/api'

// ── API helpers ───────────────────────────────────────────────────────────────
const getUsers    = () => api.get('/auth/users').then(r => r.data)
const createUser  = (d: any) => api.post('/auth/users', d).then(r => r.data)
const patchUser   = (id: number, d: any) => api.patch(`/auth/users/${id}`, d).then(r => r.data)
const deleteUser  = (id: number) => api.delete(`/auth/users/${id}`)
const resetPass   = (id: number, pwd: string) =>
  api.post(`/auth/users/${id}/password`, { password_actual: '', password_nuevo: pwd }).then(r => r.data)

const ROL_LABEL: Record<string, string> = { editor: 'Editor', viewer: 'Visor' }
const ROL_COLOR: Record<string, string> = {
  editor: 'bg-brand-50 text-brand-700 border-brand-200',
  viewer: 'bg-slate-50 text-slate-600 border-slate-200',
}

// ── Modal base ────────────────────────────────────────────────────────────────
function Modal({ open, onClose, title, children }: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

// ── Create User Form ──────────────────────────────────────────────────────────
function CreateUserModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({ username: '', nombre: '', password: '', rol: 'viewer' })
  const [error, setError] = useState('')

  const create = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      setForm({ username: '', nombre: '', password: '', rol: 'viewer' })
      setError('')
      onClose()
    },
    onError: (e: any) => setError(e?.response?.data?.detail ?? 'Error al crear usuario'),
  })

  return (
    <Modal open={open} onClose={onClose} title="Nuevo Usuario">
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Nombre completo</label>
          <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} placeholder="Ej. Juan David Giraldo" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Usuario (login)</label>
          <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            value={form.username} onChange={e => setForm({ ...form, username: e.target.value.toLowerCase().replace(/\s/g, '_') })}
            placeholder="ej. juan.giraldo" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Contraseña inicial</label>
          <input type="password" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Mínimo 6 caracteres" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Rol</label>
          <div className="flex gap-3">
            {(['viewer', 'editor'] as const).map(r => (
              <button key={r} type="button"
                onClick={() => setForm({ ...form, rol: r })}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-all ${
                  form.rol === r ? 'bg-brand-900 text-white border-brand-900' : 'bg-white text-slate-600 border-slate-200 hover:border-brand-300'
                }`}>
                {r === 'editor' ? '🔑 Editor' : '👁 Visor'}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-slate-400 mt-1.5">
            {form.rol === 'editor'
              ? 'Puede crear, editar y eliminar registros.'
              : 'Solo puede ver la información, sin modificar.'}
          </p>
        </div>
        {error && <p className="text-red-500 text-xs bg-red-50 rounded-lg px-3 py-2">{error}</p>}
        <button
          onClick={() => create.mutate(form)}
          disabled={!form.nombre || !form.username || !form.password || create.isPending}
          className="w-full bg-brand-900 hover:bg-brand-700 text-white py-2.5 rounded-lg text-sm font-semibold disabled:opacity-40 transition-colors"
        >
          {create.isPending ? 'Creando…' : 'Crear usuario'}
        </button>
      </div>
    </Modal>
  )
}

// ── Reset Password Modal ──────────────────────────────────────────────────────
function ResetPassModal({ user, onClose }: { user: any; onClose: () => void }) {
  const [pwd, setPwd] = useState('')
  const [done, setDone] = useState(false)
  const reset = useMutation({
    mutationFn: () => resetPass(user.id, pwd),
    onSuccess: () => setDone(true),
  })
  return (
    <Modal open={!!user} onClose={onClose} title="Resetear Contraseña">
      {done ? (
        <div className="text-center py-4">
          <p className="text-emerald-600 font-semibold mb-1">Contraseña actualizada</p>
          <p className="text-xs text-slate-400">El usuario puede iniciar sesión con la nueva contraseña.</p>
          <button onClick={onClose} className="mt-4 text-xs text-brand-600 underline">Cerrar</button>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-slate-600">Nueva contraseña para <strong>{user.nombre}</strong></p>
          <input type="password" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            value={pwd} onChange={e => setPwd(e.target.value)} placeholder="Nueva contraseña" autoFocus />
          <button onClick={() => reset.mutate()} disabled={pwd.length < 4 || reset.isPending}
            className="w-full bg-brand-900 text-white py-2.5 rounded-lg text-sm font-semibold disabled:opacity-40">
            {reset.isPending ? 'Guardando…' : 'Guardar contraseña'}
          </button>
          {reset.isError && <p className="text-red-500 text-xs">Error al cambiar la contraseña</p>}
        </div>
      )}
    </Modal>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Users() {
  const qc = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [resetUser, setResetUser] = useState<any>(null)

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: getUsers,
  })

  const patch = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => patchUser(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })

  const remove = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })

  const allUsers = (users as any[])

  return (
    <div className="p-6 max-w-4xl space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Usuarios</h2>
          <p className="text-xs text-slate-400 mt-0.5">Gestión de acceso al sistema</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-brand-900 hover:bg-brand-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={15} /> Nuevo usuario
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total usuarios', value: allUsers.length },
          { label: 'Editores', value: allUsers.filter((u: any) => u.rol === 'editor').length },
          { label: 'Visores', value: allUsers.filter((u: any) => u.rol === 'viewer').length },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-100 shadow-sm px-5 py-4">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">{s.label}</p>
            <p className="text-3xl font-bold text-slate-900 mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-800 border-b border-slate-700">
              <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-300 uppercase tracking-wide">Usuario</th>
              <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-300 uppercase tracking-wide">Login</th>
              <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-300 uppercase tracking-wide">Rol</th>
              <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-300 uppercase tracking-wide">Estado</th>
              <th className="sticky right-0 bg-slate-800 px-5 py-3 text-right text-[11px] font-semibold text-slate-300 uppercase tracking-wide">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr><td colSpan={5} className="px-5 py-10 text-center text-slate-300">Cargando…</td></tr>
            ) : allUsers.length === 0 ? (
              <tr><td colSpan={5} className="px-5 py-10 text-center text-slate-300">Sin usuarios registrados</td></tr>
            ) : allUsers.map((u: any) => (
              <tr key={u.id} className="hover:bg-slate-50 even:bg-slate-50/60 transition-colors group">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-brand-900 flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {u.nombre.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium text-slate-800">{u.nombre}</span>
                  </div>
                </td>
                <td className="px-5 py-3.5 text-slate-500 font-mono text-xs">{u.username}</td>
                <td className="px-5 py-3.5">
                  <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${ROL_COLOR[u.rol] ?? 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                    {u.rol === 'editor' ? <Shield size={10} /> : <Eye size={10} />}
                    {ROL_LABEL[u.rol] ?? u.rol}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <span className={`inline-block w-2 h-2 rounded-full ${u.activo ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                  <span className="text-xs text-slate-400 ml-1.5">{u.activo ? 'Activo' : 'Inactivo'}</span>
                </td>
                <td className="sticky right-0 bg-white group-hover:bg-slate-50 border-l border-slate-100 px-4 py-3.5 transition-colors">
                  <div className="flex items-center justify-end gap-1">
                    {/* Cambiar rol */}
                    <button
                      title="Cambiar rol"
                      onClick={() => patch.mutate({ id: u.id, data: { rol: u.rol === 'editor' ? 'viewer' : 'editor' } })}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                    >
                      <UserCheck size={15} />
                    </button>
                    {/* Resetear contraseña */}
                    <button
                      title="Resetear contraseña"
                      onClick={() => setResetUser(u)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                    >
                      <KeyRound size={15} />
                    </button>
                    {/* Desactivar / Reactivar */}
                    <button
                      title={u.activo ? 'Desactivar acceso' : 'Reactivar acceso'}
                      onClick={() => {
                        if (u.activo && !confirm(`¿Desactivar acceso de ${u.nombre}?`)) return
                        patch.mutate({ id: u.id, data: { activo: !u.activo } })
                      }}
                      className={`p-1.5 rounded-lg transition-colors ${
                        u.activo
                          ? 'text-slate-400 hover:text-red-500 hover:bg-red-50'
                          : 'text-emerald-500 hover:bg-emerald-50'
                      }`}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[11px] text-slate-400 text-center">
        Rol <strong>Editor</strong>: crea y modifica registros · Rol <strong>Visor</strong>: solo lectura
      </p>

      <CreateUserModal open={showCreate} onClose={() => setShowCreate(false)} />
      {resetUser && <ResetPassModal user={resetUser} onClose={() => setResetUser(null)} />}
    </div>
  )
}
