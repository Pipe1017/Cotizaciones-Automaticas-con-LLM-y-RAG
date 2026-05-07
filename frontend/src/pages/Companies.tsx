import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getCompanies, createCompany, updateCompany, deleteCompany,
  getContactsByCompany, createContact, updateContact, deleteContact,
} from '../lib/api'
import { useState } from 'react'
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp, UserPlus } from 'lucide-react'
import Modal from '../components/Modal'
import PageHeader from '../components/PageHeader'

const REGIONES = ['BOG', 'MED', 'CLO', 'CTG', 'BAQ', 'PEI', 'BGA', 'VUP']
const TIPOS = ['cliente', 'prospecto'] as const
const EMPTY_CO = { nombre: '', tipo: 'cliente' as string, industria: '', ciudad: '', region: '', pais: 'Colombia' }
const EMPTY_CT = { nombre: '', cargo: '', email: '', telefono: '' }

// ── Inline contacts for a company row ─────────────────────────
function ContactsRow({ companyId }: { companyId: number }) {
  const qc = useQueryClient()
  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState({ ...EMPTY_CT })
  const [editId, setEditId] = useState<number | null>(null)

  const { data: contacts = [] } = useQuery({
    queryKey: ['contacts', companyId],
    queryFn: () => getContactsByCompany(companyId),
  })

  const save = useMutation({
    mutationFn: () =>
      editId
        ? updateContact(editId, { ...form, company_id: companyId })
        : createContact({ ...form, company_id: companyId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contacts', companyId] })
      setAddOpen(false)
      setEditId(null)
      setForm({ ...EMPTY_CT })
    },
  })

  const remove = useMutation({
    mutationFn: deleteContact,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contacts', companyId] }),
  })

  const openEdit = (c: any) => {
    setForm({ nombre: c.nombre, cargo: c.cargo || '', email: c.email || '', telefono: c.telefono || '' })
    setEditId(c.id)
    setAddOpen(true)
  }

  return (
    <div className="px-8 py-3 bg-slate-50/70 border-b border-gray-100">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Contactos clave</p>
        {!addOpen && (
          <button
            onClick={() => { setForm({ ...EMPTY_CT }); setEditId(null); setAddOpen(true) }}
            className="text-xs text-brand-600 hover:text-brand-800 font-medium flex items-center gap-1">
            <UserPlus size={12} /> Agregar contacto
          </button>
        )}
      </div>

      {/* Add/edit form */}
      {addOpen && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3 p-3 bg-white rounded-lg border border-brand-100">
          {(['nombre', 'cargo', 'email', 'telefono'] as const).map(field => (
            <div key={field}>
              <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-0.5 capitalize">{field}</label>
              <input
                value={form[field as keyof typeof form]}
                onChange={e => setForm({ ...form, [field]: e.target.value })}
                className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-brand-400"
              />
            </div>
          ))}
          <div className="col-span-2 md:col-span-4 flex gap-2 mt-1">
            <button
              onClick={() => save.mutate()}
              disabled={!form.nombre || save.isPending}
              className="bg-brand-500 text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-brand-600 disabled:opacity-50">
              {save.isPending ? 'Guardando...' : editId ? 'Actualizar' : 'Agregar'}
            </button>
            <button
              onClick={() => { setAddOpen(false); setEditId(null); setForm({ ...EMPTY_CT }) }}
              className="text-xs text-gray-500 hover:text-gray-700">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {(contacts as any[]).length === 0 && !addOpen ? (
        <p className="text-xs text-gray-400 italic">Sin contactos registrados</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {(contacts as any[]).map((c: any) => (
            <div key={c.id}
              className="group flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs">
              <div>
                <p className="font-medium text-gray-800">{c.nombre}</p>
                {c.cargo && <p className="text-gray-400">{c.cargo}</p>}
                {c.email && <p className="text-gray-400">{c.email}</p>}
                {c.telefono && <p className="text-gray-400">{c.telefono}</p>}
              </div>
              <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity ml-1">
                <button onClick={() => openEdit(c)}
                  className="p-0.5 text-gray-400 hover:text-brand-500"><Pencil size={11} /></button>
                <button onClick={() => { if (confirm(`¿Eliminar a "${c.nombre}"?`)) remove.mutate(c.id) }}
                  className="p-0.5 text-gray-400 hover:text-red-500"><Trash2 size={11} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Company row (expandable contacts) ─────────────────────────
function CompanyRow({ c, onEdit, onDelete }: { c: any; onEdit: (c: any) => void; onDelete: (c: any) => void }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <tr className={`transition-colors cursor-pointer group ${open ? 'bg-brand-100 shadow-[inset_3px_0_0_#0f2560]' : 'hover:bg-slate-50 even:bg-slate-50/60'}`}
        onClick={() => setOpen(o => !o)}>
        <td className="px-4 py-3 w-8">
          {open
            ? <ChevronUp size={14} className="text-brand-400" />
            : <ChevronDown size={14} className="text-slate-300 group-hover:text-slate-400" />}
        </td>
        <td className="px-5 py-3 font-semibold text-slate-800">{c.nombre}</td>
        <td className="px-5 py-3 text-slate-500">{c.industria || '—'}</td>
        <td className="px-5 py-3 text-slate-500">{c.ciudad || '—'}</td>
        <td className="px-5 py-3">
          {c.region && (
            <span className="bg-brand-100 text-brand-700 px-2 py-0.5 rounded text-xs font-medium">{c.region}</span>
          )}
        </td>
        <td className="px-5 py-3 text-slate-400 text-xs">{c.pais}</td>
        <td className={`sticky right-0 px-3 py-3 border-l border-slate-100 transition-colors ${open ? 'bg-brand-100' : 'bg-white group-hover:bg-slate-50'}`}
          onClick={e => e.stopPropagation()}>
          <div className="flex gap-1">
            <button onClick={() => onEdit(c)}
              className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors">
              <Pencil size={14} />
            </button>
            <button onClick={() => onDelete(c)}
              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
              <Trash2 size={14} />
            </button>
          </div>
        </td>
      </tr>
      {open && (
        <tr>
          <td colSpan={7} className="p-0">
            <ContactsRow companyId={c.id} />
          </td>
        </tr>
      )}
    </>
  )
}

// ── Main page ──────────────────────────────────────────────────
export default function Companies({ modulo }: { modulo?: string }) {
  const [tab, setTab] = useState<'cliente' | 'prospecto'>('cliente')
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ ...EMPTY_CO })
  const [editId, setEditId] = useState<number | null>(null)
  const qc = useQueryClient()

  const { data: companies = [], isLoading } = useQuery({
    queryKey: ['companies', tab, search, modulo],
    queryFn: () => getCompanies(search || undefined, modulo),
  })

  // Filter by tab client-side (avoids separate query calls)
  const filtered = (companies as any[]).filter((c: any) =>
    c.tipo === tab && (!search || c.nombre.toLowerCase().includes(search.toLowerCase()))
  )

  const save = useMutation({
    mutationFn: () =>
      editId ? updateCompany(editId, form) : createCompany(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['companies'] })
      setModal(false)
    },
  })

  const remove = useMutation({
    mutationFn: (id: number) => deleteCompany(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['companies'] }),
  })

  const openCreate = () => {
    setForm({ ...EMPTY_CO, tipo: tab })
    setEditId(null)
    setModal(true)
  }

  const openEdit = (c: any) => {
    setForm({
      nombre: c.nombre, tipo: c.tipo || 'cliente',
      industria: c.industria || '', ciudad: c.ciudad || '',
      region: c.region || '', pais: c.pais || 'Colombia',
    })
    setEditId(c.id)
    setModal(true)
  }

  const totalClientes = (companies as any[]).filter((c: any) => c.tipo === 'cliente').length
  const totalProspectos = (companies as any[]).filter((c: any) => c.tipo === 'prospecto').length

  const F = (key: keyof typeof EMPTY_CO, label?: string) => (
    <div key={key}>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label || key.replace('_', ' ')}</label>
      {key === 'region' ? (
        <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500"
          value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })}>
          <option value="">— Seleccionar —</option>
          {REGIONES.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      ) : key === 'tipo' ? (
        <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500"
          value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })}>
          {TIPOS.map(t => <option key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
        </select>
      ) : (
        <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500"
          value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} />
      )}
    </div>
  )

  return (
    <div className="p-8">
      <PageHeader
        title="Empresas"
        subtitle={`${totalClientes} clientes · ${totalProspectos} prospectos`}
        action={
          <button onClick={openCreate}
            className="flex items-center gap-2 bg-brand-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-600 transition-colors">
            <Plus size={16} /> Nueva Empresa
          </button>
        }
      />

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 mb-4">
        {TIPOS.map(t => (
          <button key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2 text-sm font-medium border-b-2 -mb-px transition-colors capitalize ${
              tab === t
                ? 'border-brand-500 text-brand-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            {t === 'cliente' ? `Clientes (${totalClientes})` : `Prospectos (${totalProspectos})`}
          </button>
        ))}
      </div>

      <input placeholder="Buscar empresa..." value={search} onChange={e => setSearch(e.target.value)}
        className="w-full max-w-sm border border-gray-300 rounded-lg px-3 py-2 text-sm mb-5 focus:ring-2 focus:ring-brand-500" />

      {isLoading ? <p className="text-gray-400">Cargando...</p> : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-800 border-b border-slate-700">
              <tr>
                <th className="px-4 py-3 w-8" />
                {['Nombre', 'Industria', 'Ciudad', 'Regional', 'País', ''].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-[11px] font-semibold text-slate-300 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((c: any) => (
                <CompanyRow
                  key={c.id}
                  c={c}
                  onEdit={openEdit}
                  onDelete={(c) => { if (confirm(`¿Eliminar "${c.nombre}"?`)) remove.mutate(c.id) }}
                />
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-gray-400 text-sm">
                    Sin {tab === 'cliente' ? 'clientes' : 'prospectos'} registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)}
        title={editId ? 'Editar Empresa' : 'Nueva Empresa'}>
        <div className="grid grid-cols-2 gap-4">
          {F('nombre', 'Nombre *')}
          {F('tipo', 'Tipo')}
          {F('industria', 'Industria')}
          {F('ciudad', 'Ciudad')}
          {F('region', 'Regional')}
          {F('pais', 'País')}
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={() => save.mutate()} disabled={!form.nombre || save.isPending}
            className="bg-brand-500 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-brand-600 disabled:opacity-50 transition-colors">
            {save.isPending ? 'Guardando...' : 'Guardar'}
          </button>
          <button onClick={() => setModal(false)} className="text-sm text-gray-500 hover:text-gray-700">Cancelar</button>
        </div>
      </Modal>
    </div>
  )
}
