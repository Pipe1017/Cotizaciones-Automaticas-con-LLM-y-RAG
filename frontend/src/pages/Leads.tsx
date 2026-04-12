import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getLeads, createLead, updateLead, advanceLead, getLeadHistory } from '../lib/api'
import { useState } from 'react'
import { Plus, Pencil, ArrowRight, History } from 'lucide-react'
import Modal from '../components/Modal'
import PageHeader from '../components/PageHeader'
import Badge from '../components/Badge'

const ETAPAS = ['Prospecto', 'Contactado', 'Reunión Agendada', 'Propuesta Enviada', 'Negociación', 'Cerrado', 'Perdido']
const ROLES = ['Lead Directo', 'Equity/Inversor', 'Socio Estratégico', 'Sponsor', 'Offtaker']
const PRIORIDADES = ['Alta', 'Media', 'Baja']

const ETAPA_VARIANT: Record<string, any> = {
  Prospecto: 'gray', Contactado: 'blue', 'Reunión Agendada': 'purple',
  'Propuesta Enviada': 'indigo', Negociación: 'amber', Cerrado: 'green', Perdido: 'red',
}
const PRIORIDAD_VARIANT: Record<string, any> = { Alta: 'red', Media: 'amber', Baja: 'green' }

const EMPTY_LEAD = {
  empresa: '', contacto: '', cargo: '', email: '', telefono: '', industria: '',
  rol_estrategico: '', responsable: '', etapa: 'Prospecto', prioridad: 'Media',
  proxima_accion: '', notas: '', linkedin_url: '', valor_estimado: '',
}

function HistoryModal({ leadId, onClose }: { leadId: number; onClose: () => void }) {
  const { data: history = [], isLoading } = useQuery({
    queryKey: ['lead-history', leadId],
    queryFn: () => getLeadHistory(leadId),
  })
  return (
    <Modal open title="Historial de Actividad" onClose={onClose}>
      {isLoading ? <p className="text-gray-400">Cargando...</p> : (
        <div className="space-y-3">
          {history.length === 0 && <p className="text-gray-400 text-sm">Sin historial aún.</p>}
          {(history as any[]).map((h: any) => (
            <div key={h.id} className="border border-gray-100 rounded-lg p-3">
              <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
                <span>{h.fecha}</span>
                <span>·</span>
                <span className="font-medium text-gray-600">{h.responsable}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Badge variant={ETAPA_VARIANT[h.etapa_anterior] || 'gray'}>{h.etapa_anterior}</Badge>
                <ArrowRight size={12} className="text-gray-400" />
                <Badge variant={ETAPA_VARIANT[h.etapa_nueva] || 'green'}>{h.etapa_nueva}</Badge>
              </div>
              {h.accion_realizada && <p className="text-sm text-gray-700 mt-1">{h.accion_realizada}</p>}
              {h.resultado && <p className="text-xs text-gray-500 mt-0.5">Resultado: {h.resultado}</p>}
            </div>
          ))}
        </div>
      )}
    </Modal>
  )
}

export default function Leads() {
  const [filter, setFilter] = useState({ etapa: '', prioridad: '', search: '' })
  const [modal, setModal] = useState<'form' | 'advance' | 'history' | null>(null)
  const [form, setForm] = useState<any>({ ...EMPTY_LEAD })
  const [editId, setEditId] = useState<number | null>(null)
  const [advanceData, setAdvanceData] = useState({ etapa_nueva: '', accion_realizada: '', resultado: '', responsable: '' })
  const [historyId, setHistoryId] = useState<number | null>(null)
  const qc = useQueryClient()

  const params = { etapa: filter.etapa || undefined, prioridad: filter.prioridad || undefined, search: filter.search || undefined }
  const { data: leads = [], isLoading } = useQuery({
    queryKey: ['leads', params],
    queryFn: () => getLeads(params),
  })

  const save = useMutation({
    mutationFn: () => {
      const payload = { ...form, valor_estimado: form.valor_estimado || null }
      return editId ? updateLead(editId, payload) : createLead(payload)
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['leads'] }); setModal(null) },
  })

  const advance = useMutation({
    mutationFn: () => advanceLead(editId!, advanceData),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['leads'] }); setModal(null) },
  })

  const openCreate = () => { setForm({ ...EMPTY_LEAD }); setEditId(null); setModal('form') }
  const openEdit = (l: any) => {
    setForm({ empresa: l.empresa, contacto: l.contacto || '', cargo: l.cargo || '', email: l.email || '', telefono: l.telefono || '', industria: l.industria || '', rol_estrategico: l.rol_estrategico || '', responsable: l.responsable || '', etapa: l.etapa, prioridad: l.prioridad || 'Media', proxima_accion: l.proxima_accion || '', notas: l.notas || '', linkedin_url: l.linkedin_url || '', valor_estimado: l.valor_estimado || '' })
    setEditId(l.id); setModal('form')
  }
  const openAdvance = (l: any) => {
    setEditId(l.id)
    const nextIdx = Math.min(ETAPAS.indexOf(l.etapa) + 1, ETAPAS.length - 1)
    setAdvanceData({ etapa_nueva: ETAPAS[nextIdx], accion_realizada: '', resultado: '', responsable: l.responsable || '' })
    setModal('advance')
  }

  const totalPipeline = (leads as any[]).filter(l => l.valor_estimado).reduce((s, l) => s + Number(l.valor_estimado), 0)

  return (
    <div className="p-8">
      <PageHeader
        title="Leads — Fertilizantes"
        subtitle={`${(leads as any[]).length} leads · Pipeline $${(totalPipeline / 1_000_000).toFixed(1)}M`}
        action={<button onClick={openCreate} className="flex items-center gap-2 bg-brand-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-600"><Plus size={16} /> Nuevo Lead</button>}
      />

      {/* Filtros */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <input placeholder="Buscar empresa..." value={filter.search} onChange={e => setFilter({ ...filter, search: e.target.value })}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-52 focus:ring-2 focus:ring-brand-500" />
        <select value={filter.etapa} onChange={e => setFilter({ ...filter, etapa: e.target.value })}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500">
          <option value="">Todas las etapas</option>
          {ETAPAS.map(e => <option key={e} value={e}>{e}</option>)}
        </select>
        <select value={filter.prioridad} onChange={e => setFilter({ ...filter, prioridad: e.target.value })}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500">
          <option value="">Toda prioridad</option>
          {PRIORIDADES.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {isLoading ? <p className="text-gray-400">Cargando...</p> : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>{['Empresa', 'Contacto', 'Industria / Rol', 'Etapa', 'Prioridad', 'Valor Est.', 'Próx. Acción', ''].map(h =>
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(leads as any[]).map((l) => (
                <tr key={l.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{l.empresa}</p>
                    {l.email && <p className="text-xs text-gray-400">{l.email}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <p>{l.contacto || '—'}</p>
                    {l.cargo && <p className="text-xs text-gray-400">{l.cargo}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-gray-500 text-xs">{l.industria || '—'}</p>
                    {l.rol_estrategico && <p className="text-xs text-gray-400 italic">{l.rol_estrategico}</p>}
                  </td>
                  <td className="px-4 py-3"><Badge variant={ETAPA_VARIANT[l.etapa] || 'gray'}>{l.etapa}</Badge></td>
                  <td className="px-4 py-3">{l.prioridad && <Badge variant={PRIORIDAD_VARIANT[l.prioridad] || 'gray'}>{l.prioridad}</Badge>}</td>
                  <td className="px-4 py-3 text-emerald-700 font-medium text-sm">
                    {l.valor_estimado ? `$${Number(l.valor_estimado).toLocaleString()}` : '—'}
                  </td>
                  <td className="px-4 py-3 max-w-xs">
                    <p className="text-xs text-gray-600 truncate">{l.proxima_accion || '—'}</p>
                    {l.fecha_prox_acc && <p className="text-xs text-gray-400">{l.fecha_prox_acc}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 justify-end">
                      <button onClick={() => openAdvance(l)} title="Avanzar etapa"
                        className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors"><ArrowRight size={14} /></button>
                      <button onClick={() => openEdit(l)} title="Editar"
                        className="p-1.5 text-gray-400 hover:text-brand-500 hover:bg-brand-50 rounded transition-colors"><Pencil size={14} /></button>
                      <button onClick={() => { setHistoryId(l.id); setModal('history') }} title="Historial"
                        className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors"><History size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {(leads as any[]).length === 0 && <tr><td colSpan={8} className="px-5 py-10 text-center text-gray-400">Sin leads para los filtros aplicados</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Crear/Editar Lead */}
      <Modal open={modal === 'form'} onClose={() => setModal(null)}
        title={editId ? 'Editar Lead' : 'Nuevo Lead'} width="max-w-2xl">
        <div className="grid grid-cols-2 gap-4">
          {[
            { k: 'empresa', l: 'Empresa *' }, { k: 'contacto', l: 'Contacto' },
            { k: 'cargo', l: 'Cargo' }, { k: 'email', l: 'Email' },
            { k: 'telefono', l: 'Teléfono' }, { k: 'industria', l: 'Industria' },
            { k: 'responsable', l: 'Responsable' }, { k: 'valor_estimado', l: 'Valor Est. ($)' },
            { k: 'linkedin_url', l: 'LinkedIn URL' }, { k: 'proxima_accion', l: 'Próx. Acción' },
          ].map(f => (
            <div key={f.k}>
              <label className="block text-xs font-medium text-gray-600 mb-1">{f.l}</label>
              <input value={form[f.k]} onChange={e => setForm({ ...form, [f.k]: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500" />
            </div>
          ))}
          {[
            { k: 'rol_estrategico', l: 'Rol Estratégico', opts: ROLES },
            { k: 'etapa', l: 'Etapa', opts: ETAPAS },
            { k: 'prioridad', l: 'Prioridad', opts: PRIORIDADES },
          ].map(f => (
            <div key={f.k}>
              <label className="block text-xs font-medium text-gray-600 mb-1">{f.l}</label>
              <select value={form[f.k]} onChange={e => setForm({ ...form, [f.k]: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500">
                <option value="">— Seleccionar —</option>
                {f.opts.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          ))}
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">Notas</label>
            <textarea rows={3} value={form.notas} onChange={e => setForm({ ...form, notas: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:ring-2 focus:ring-brand-500" />
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={() => save.mutate()} disabled={!form.empresa || save.isPending}
            className="bg-brand-500 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-brand-600 disabled:opacity-50">
            {save.isPending ? 'Guardando...' : 'Guardar'}
          </button>
          <button onClick={() => setModal(null)} className="text-sm text-gray-500">Cancelar</button>
        </div>
      </Modal>

      {/* Modal Avanzar Etapa */}
      <Modal open={modal === 'advance'} onClose={() => setModal(null)} title="Avanzar Etapa">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nueva Etapa</label>
            <select value={advanceData.etapa_nueva} onChange={e => setAdvanceData({ ...advanceData, etapa_nueva: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500">
              {ETAPAS.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Acción realizada</label>
            <input value={advanceData.accion_realizada} onChange={e => setAdvanceData({ ...advanceData, accion_realizada: e.target.value })}
              placeholder="Ej: Reunión de presentación"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Resultado</label>
            <input value={advanceData.resultado} onChange={e => setAdvanceData({ ...advanceData, resultado: e.target.value })}
              placeholder="Ej: Interesados, solicitan propuesta"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Responsable</label>
            <input value={advanceData.responsable} onChange={e => setAdvanceData({ ...advanceData, responsable: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500" />
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={() => advance.mutate()} disabled={!advanceData.etapa_nueva || advance.isPending}
            className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50">
            <ArrowRight size={15} /> {advance.isPending ? 'Guardando...' : 'Avanzar'}
          </button>
          <button onClick={() => setModal(null)} className="text-sm text-gray-500">Cancelar</button>
        </div>
      </Modal>

      {/* Modal Historial */}
      {modal === 'history' && historyId && (
        <HistoryModal leadId={historyId} onClose={() => setModal(null)} />
      )}
    </div>
  )
}
