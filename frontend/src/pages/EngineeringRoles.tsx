import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, HardHat } from 'lucide-react'
import api from '../lib/api'

const getRoles  = () => api.get('/engineering-roles').then(r => r.data)
const saveRole  = (d: any) => d.id
  ? api.put(`/engineering-roles/${d.id}`, d).then(r => r.data)
  : api.post('/engineering-roles', d).then(r => r.data)
const deleteRole = (id: number) => api.delete(`/engineering-roles/${id}`)

const EMPTY = { nombre: '', descripcion: '', tarifa_base_usd: '', margen_pct: '30', activo: true }

function Modal({ open, onClose, title, children }: any) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">×</button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

export default function EngineeringRoles() {
  const qc = useQueryClient()
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState<any>({ ...EMPTY })

  const { data: roles = [], isLoading } = useQuery({ queryKey: ['engineering-roles'], queryFn: getRoles })

  const save = useMutation({
    mutationFn: saveRole,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['engineering-roles'] }); setModal(false) },
  })
  const remove = useMutation({
    mutationFn: deleteRole,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['engineering-roles'] }),
  })

  const openCreate = () => { setForm({ ...EMPTY }); setModal(true) }
  const openEdit = (r: any) => {
    setForm({
      id: r.id, nombre: r.nombre, descripcion: r.descripcion || '',
      tarifa_base_usd: String(r.tarifa_base_usd), margen_pct: String(r.margen_pct), activo: r.activo,
    })
    setModal(true)
  }

  const tarifa_cliente = form.tarifa_base_usd && form.margen_pct
    ? (parseFloat(form.tarifa_base_usd) * (1 + parseFloat(form.margen_pct) / 100)).toFixed(2)
    : '—'

  return (
    <div className="p-6 max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <HardHat size={20} className="text-brand-700" /> Servicios de Ingeniería
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Tarifas por hora para técnicos, ingenieros y diseñadores</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 bg-brand-900 hover:bg-brand-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
          <Plus size={15} /> Nuevo rol
        </button>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-700">
        <strong>Tarifas internas:</strong> La tarifa base es el costo OPEX. El cliente solo ve la tarifa con margen aplicado.
        La IA usa el nombre del rol para asignar servicios — usa nombres descriptivos y consistentes.
      </div>

      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-800 border-b border-slate-700">
            <tr>
              {['Rol', 'Descripción', 'Tarifa Base/h', 'Margen', 'Tarifa Cliente/h', 'Estado', ''].map(h => (
                <th key={h} className="px-5 py-3 text-left text-[11px] font-semibold text-slate-300 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr><td colSpan={7} className="px-5 py-10 text-center text-slate-300">Cargando…</td></tr>
            ) : (roles as any[]).map((r: any) => (
              <tr key={r.id} className="hover:bg-slate-50 even:bg-slate-50/60 transition-colors group">
                <td className="px-5 py-3.5 font-semibold text-slate-800">{r.nombre}</td>
                <td className="px-5 py-3.5 text-slate-500 text-xs max-w-[200px] truncate">{r.descripcion || '—'}</td>
                <td className="px-5 py-3.5 font-mono text-slate-700">${Number(r.tarifa_base_usd).toFixed(2)}</td>
                <td className="px-5 py-3.5 text-slate-500">{Number(r.margen_pct).toFixed(0)}%</td>
                <td className="px-5 py-3.5 font-semibold text-emerald-700">${Number(r.tarifa_cliente_usd).toFixed(2)}</td>
                <td className="px-5 py-3.5">
                  <span className={`inline-block w-2 h-2 rounded-full ${r.activo ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                  <span className="text-xs text-slate-400 ml-1.5">{r.activo ? 'Activo' : 'Inactivo'}</span>
                </td>
                <td className="sticky right-0 bg-white group-hover:bg-slate-50 border-l border-slate-100 px-4 py-3.5 transition-colors">
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(r)}
                      className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg"><Pencil size={14} /></button>
                    <button onClick={() => { if (confirm(`¿Desactivar "${r.nombre}"?`)) remove.mutate(r.id) }}
                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={form.id ? 'Editar Rol' : 'Nuevo Rol'}>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Nombre del rol *</label>
            <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })}
              placeholder="ej: Ingeniero Senior" />
            <p className="text-[11px] text-slate-400 mt-1">La IA usa este nombre exacto — escríbelo como quieres que aparezca en la cotización</p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Descripción</label>
            <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })}
              placeholder="Qué hace este rol" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Tarifa base USD/h (interno)</label>
              <input type="number" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                value={form.tarifa_base_usd} onChange={e => setForm({ ...form, tarifa_base_usd: e.target.value })}
                placeholder="50.00" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Margen OPEX %</label>
              <input type="number" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                value={form.margen_pct} onChange={e => setForm({ ...form, margen_pct: e.target.value })}
                placeholder="30" />
            </div>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 flex items-center justify-between">
            <span className="text-xs text-emerald-700 font-medium">Tarifa cliente (lo que ve el cliente)</span>
            <span className="text-lg font-bold text-emerald-800">${tarifa_cliente}/h</span>
          </div>
          <button onClick={() => save.mutate({
            ...form,
            tarifa_base_usd: parseFloat(form.tarifa_base_usd) || 0,
            margen_pct: parseFloat(form.margen_pct) || 30,
          })}
            disabled={!form.nombre || !form.tarifa_base_usd || save.isPending}
            className="w-full bg-brand-900 hover:bg-brand-700 text-white py-2.5 rounded-lg text-sm font-semibold disabled:opacity-40 transition-colors">
            {save.isPending ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </Modal>
    </div>
  )
}
