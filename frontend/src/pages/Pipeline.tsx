import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getOpportunities, createOpportunity, updateOpportunity, deleteOpportunity,
  getCompanies, getBusinessLines, generateQuotation, createQuotation, getQuotation,
  getQuotationItems, editQuotation, newQuotationVersion, getQuotationVersions,
  uploadOpportunityExcel, uploadOpportunityPdf, updateQuotationStatus,
} from '../lib/api'
import { useState, useRef } from 'react'
import {
  Plus, Pencil, Trash2, ChevronDown, ChevronUp,
  Sparkles, FileText, Download, X, Upload, GitBranch,
} from 'lucide-react'
import Modal from '../components/Modal'
import PageHeader from '../components/PageHeader'
import Badge from '../components/Badge'

const ETAPAS = ['En Proceso', 'Enviada', 'Ganada', 'Perdida', 'Cancelada por Cliente']

const ETAPA_VARIANT: Record<string, any> = {
  'En Proceso': 'blue', 'Enviada': 'amber', 'Ganada': 'green',
  'Perdida': 'red', 'Cancelada por Cliente': 'gray',
}

const PCTS = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]

const probCombined = (go: number, get: number) =>
  Math.round((go * get) / 100)

const CIUDADES = [
  { code: 'med', label: 'Medellín' }, { code: 'bog', label: 'Bogotá' },
  { code: 'cal', label: 'Cali' },     { code: 'bar', label: 'Barranquilla' },
  { code: 'buc', label: 'Bucaramanga' }, { code: 'man', label: 'Manizales' },
  { code: 'per', label: 'Pereira' },  { code: 'car', label: 'Cartagena' },
]

const fmt = (n: number) =>
  n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M`
  : n >= 1_000   ? `$${(n / 1_000).toFixed(0)}K`
  : `$${n.toFixed(0)}`

// ── Edit / New-version form (shared) ──────────────────────────
interface QItem { referencia_usa: string; descripcion: string; referencia_cod_proveedor: string; marca: string; cantidad: string; precio_unitario_usd: string }
const toFormItems = (items: any[]): QItem[] =>
  items.map(it => ({
    referencia_usa: it.referencia_usa || '',
    descripcion: it.descripcion || '',
    referencia_cod_proveedor: it.referencia_cod_proveedor || '',
    marca: it.marca || 'HOPPECKE',
    cantidad: String(it.cantidad),
    precio_unitario_usd: String(it.precio_unitario_usd),
  }))

function QuoteEditForm({
  quotationId, mode, onDone,
}: { quotationId: number; mode: 'edit' | 'new-version'; onDone: () => void }) {
  const qc = useQueryClient()
  const { data: quote } = useQuery({ queryKey: ['quotation', quotationId], queryFn: () => getQuotation(quotationId) })
  const { data: rawItems = [] } = useQuery({ queryKey: ['quotation-items', quotationId], queryFn: () => getQuotationItems(quotationId) })

  const [items, setItems] = useState<QItem[]>([])
  const [pagos, setPagos] = useState('')
  const [garantia, setGarantia] = useState('')
  const [obs, setObs] = useState('')
  const [initialized, setInitialized] = useState(false)

  if (!initialized && (rawItems as any[]).length > 0 && quote) {
    setItems(toFormItems(rawItems as any[]))
    setPagos(quote.condiciones_pago || '30 días')
    setGarantia(quote.condiciones_garantia || '1 año')
    setObs(quote.observaciones || '')
    setInitialized(true)
  }

  const updateItem = (idx: number, field: keyof QItem, val: string) =>
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: val } : it))

  const subtotal = items.reduce((s, it) => s + (parseFloat(it.cantidad) || 0) * (parseFloat(it.precio_unitario_usd) || 0), 0)
  const total = subtotal * 1.19

  const mutFn = mode === 'edit' ? editQuotation : newQuotationVersion
  const save = useMutation({
    mutationFn: () => mutFn(quotationId, {
      condiciones_pago: pagos,
      condiciones_garantia: garantia,
      observaciones: obs,
      iva_pct: 19,
      landed_pct: 0,
      margen_pct: 0,
      items: items.map(it => ({
        referencia_usa: it.referencia_usa || undefined,
        descripcion: it.descripcion,
        referencia_cod_proveedor: it.referencia_cod_proveedor || undefined,
        marca: it.marca,
        cantidad: parseFloat(it.cantidad) || 1,
        precio_unitario_usd: parseFloat(it.precio_unitario_usd) || 0,
      })),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['opportunities'] })
      qc.invalidateQueries({ queryKey: ['quotations'] })
      qc.invalidateQueries({ queryKey: ['quotation', quotationId] })
      qc.invalidateQueries({ queryKey: ['quotation-items', quotationId] })
      onDone()
    },
  })

  if (!initialized) return <p className="text-xs text-gray-400 py-4">Cargando ítems...</p>

  return (
    <div className="space-y-3 pt-2">
      {mode === 'new-version' && (
        <div className="flex items-center gap-2 text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
          <GitBranch size={13} /> Se creará una nueva versión — la oportunidad quedará vinculada a la versión nueva
        </div>
      )}

      {/* Items table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-gray-100">
            <tr>
              {['Ref. USA', 'Descripción *', 'Cód. SAP', 'Marca', 'Cant.', 'P. Unit. USD', ''].map(h =>
                <th key={h} className="px-2 py-1.5 text-left font-semibold text-gray-500">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {items.map((it, idx) => (
              <tr key={idx} className="border-t border-gray-100">
                <td className="px-1 py-1"><input value={it.referencia_usa} onChange={e => updateItem(idx, 'referencia_usa', e.target.value)} className="w-20 border border-gray-200 rounded px-1.5 py-1 text-xs" /></td>
                <td className="px-1 py-1"><input value={it.descripcion} onChange={e => updateItem(idx, 'descripcion', e.target.value)} className="w-52 border border-gray-200 rounded px-1.5 py-1 text-xs" /></td>
                <td className="px-1 py-1"><input value={it.referencia_cod_proveedor} onChange={e => updateItem(idx, 'referencia_cod_proveedor', e.target.value)} className="w-20 border border-gray-200 rounded px-1.5 py-1 text-xs" /></td>
                <td className="px-1 py-1"><input value={it.marca} onChange={e => updateItem(idx, 'marca', e.target.value)} className="w-24 border border-gray-200 rounded px-1.5 py-1 text-xs" /></td>
                <td className="px-1 py-1"><input type="number" value={it.cantidad} onChange={e => updateItem(idx, 'cantidad', e.target.value)} className="w-14 border border-gray-200 rounded px-1.5 py-1 text-xs text-right" /></td>
                <td className="px-1 py-1"><input type="number" value={it.precio_unitario_usd} onChange={e => updateItem(idx, 'precio_unitario_usd', e.target.value)} className="w-24 border border-gray-200 rounded px-1.5 py-1 text-xs text-right" /></td>
                <td className="px-1 py-1 flex gap-1 items-center">
                  {items.length > 1 && (
                    <button onClick={() => setItems(p => p.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600"><X size={13} /></button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button onClick={() => setItems(p => [...p, { referencia_usa: '', descripcion: '', referencia_cod_proveedor: '', marca: 'HOPPECKE', cantidad: '1', precio_unitario_usd: '0' }])}
        className="text-xs text-brand-600 hover:text-brand-800 font-medium flex items-center gap-1">
        <Plus size={12} /> Agregar ítem
      </button>

      <div className="flex justify-end gap-5 text-xs font-medium text-gray-600">
        <span>Subtotal: <strong>${subtotal.toLocaleString('en', { minimumFractionDigits: 2 })}</strong></span>
        <span>IVA 19%: <strong>${(subtotal * 0.19).toLocaleString('en', { minimumFractionDigits: 2 })}</strong></span>
        <span className="text-emerald-700">Total: <strong>${total.toLocaleString('en', { minimumFractionDigits: 2 })}</strong></span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="block text-[10px] font-semibold text-gray-400 uppercase mb-1">Cond. pago</label>
          <input value={pagos} onChange={e => setPagos(e.target.value)} className="input-base w-full text-sm" />
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-gray-400 uppercase mb-1">Garantía</label>
          <input value={garantia} onChange={e => setGarantia(e.target.value)} className="input-base w-full text-sm" />
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-gray-400 uppercase mb-1">Observaciones</label>
          <input value={obs} onChange={e => setObs(e.target.value)} className="input-base w-full text-sm" />
        </div>
      </div>

      {save.isError && (
        <p className="text-sm text-red-500">{(save.error as any)?.response?.data?.detail || 'Error'}</p>
      )}

      <div className="flex gap-3">
        <button onClick={() => save.mutate()} disabled={save.isPending || items.some(it => !it.descripcion)}
          className="btn-primary text-sm disabled:opacity-50">
          {save.isPending
            ? (mode === 'edit' ? 'Actualizando...' : 'Creando V nueva...')
            : (mode === 'edit' ? 'Guardar cambios y regenerar archivos' : 'Crear nueva versión')}
        </button>
        <button onClick={onDone} className="btn-ghost text-sm">Cancelar</button>
      </div>
    </div>
  )
}

// ── Trazabilidad IA ────────────────────────────────────────────
function AITrace({ quote }: { quote: any }) {
  const [open, setOpen] = useState(false)
  if (!quote?.ai_prompt) return null

  return (
    <div className="pt-1 border-t border-gray-100">
      <button onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 text-[11px] text-brand-400 hover:text-brand-600 transition-colors">
        <Sparkles size={11} />
        <ChevronDown size={11} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
        Generado con IA — ver trazabilidad
      </button>

      {open && (
        <div className="mt-2 space-y-2 text-xs">
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Prompt enviado</p>
            <p className="text-slate-700 whitespace-pre-wrap">{quote.ai_prompt}</p>
          </div>
          {quote.ai_reasoning && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
              <p className="text-[10px] font-bold text-purple-400 uppercase tracking-wide mb-1">Razonamiento del modelo</p>
              <p className="text-purple-800 whitespace-pre-wrap text-[11px] leading-relaxed">{quote.ai_reasoning}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Historial de versiones ─────────────────────────────────────
function VersionHistory({ quotationId }: { quotationId: number }) {
  const [open, setOpen] = useState(false)
  const { data: versions = [], isLoading } = useQuery({
    queryKey: ['quotation-versions', quotationId],
    queryFn: () => getQuotationVersions(quotationId),
    enabled: open,
  })

  const prev = (versions as any[]).slice(1) // skip current (index 0)

  if (prev.length === 0 && !isLoading && open) return null

  return (
    <div className="pt-1 border-t border-gray-100">
      <button onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 text-[11px] text-gray-400 hover:text-gray-600 transition-colors">
        <ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
        {open ? 'Ocultar' : 'Ver'} versiones anteriores
      </button>

      {open && (
        <div className="mt-2 space-y-1.5">
          {isLoading && <p className="text-xs text-gray-400">Cargando...</p>}
          {prev.map((v: any) => (
            <div key={v.id} className="flex items-center gap-3 text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
              <span className="font-mono font-semibold text-gray-600">{v.numero_cotizacion}</span>
              <span className="text-[10px] bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded-full font-bold">V{v.version}</span>
              <span className="text-gray-400">{v.fecha}</span>
              {v.total_usd && <span className="text-gray-500">${Number(v.total_usd).toLocaleString()}</span>}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full capitalize ${
                v.estado === 'aprobada' ? 'bg-green-100 text-green-700'
                : v.estado === 'enviada' ? 'bg-blue-100 text-blue-700'
                : v.estado === 'rechazada' ? 'bg-red-100 text-red-600'
                : 'bg-gray-100 text-gray-500'
              }`}>{v.estado}</span>
              <div className="ml-auto flex gap-2">
                {v.file_path_minio && (
                  <a href={`/api/quotations/${v.id}/download`}
                    className="text-gray-400 hover:text-emerald-600 transition-colors" title="Excel">
                    <FileText size={13} />
                  </a>
                )}
                {v.file_path_pdf && (
                  <a href={`/api/quotations/${v.id}/download/pdf-combinado`}
                    className="text-gray-400 hover:text-red-500 transition-colors" title="PDF">
                    <Download size={13} />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Ajuste manual de PDF dentro de QuotationInfo ───────────────
function ManualPdfAdjust({ opp }: { opp: any }) {
  const qc = useQueryClient()
  const pdfRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)

  const upload = useMutation({
    mutationFn: (file: File) => uploadOpportunityPdf(opp.id, file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['opportunities'] })
      setOpen(false)
    },
  })

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) upload.mutate(file)
  }

  // Ya tiene PDF manual — mostrar estado activo
  if (opp.file_manual_pdf && !open) {
    return (
      <div className="flex items-center gap-2 pt-1 border-t border-dashed border-amber-200">
        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full uppercase tracking-wide">
          Ajustado manualmente
        </span>
        <a href={`/api/opportunities/${opp.id}/download/pdf`}
          className="text-xs text-amber-700 underline hover:text-amber-900">Ver PDF</a>
        <button onClick={() => setOpen(true)}
          className="text-xs text-gray-400 hover:text-gray-600 ml-1">cambiar</button>
      </div>
    )
  }

  // Sin PDF manual — enlace discreto
  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-500 pt-1 transition-colors">
        <Upload size={10} /> Cargar PDF ajustado manualmente
      </button>
    )
  }

  // Formulario de upload
  return (
    <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-1">
      <span className="text-xs text-amber-700 font-medium">Reemplaza el PDF de esta versión:</span>
      <button onClick={() => pdfRef.current?.click()} disabled={upload.isPending}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-amber-300 text-amber-800 text-xs font-medium hover:bg-amber-100 transition-colors disabled:opacity-50">
        <Upload size={12} /> Seleccionar PDF
      </button>
      {upload.isPending && <span className="text-xs text-amber-600 animate-pulse">Subiendo...</span>}
      <button onClick={() => setOpen(false)} className="ml-auto text-amber-300 hover:text-amber-500"><X size={13} /></button>
      <input ref={pdfRef} type="file" accept=".pdf" className="hidden" onChange={handleFile} />
    </div>
  )
}

// ── Quotation info (opp already has a quote) ───────────────────
function QuotationInfo({ quotationId, numero, opp }: { quotationId: number; numero?: string; opp: any }) {
  const [mode, setMode] = useState<null | 'edit' | 'new-version'>(null)
  const { data: quote } = useQuery({
    queryKey: ['quotation', quotationId],
    queryFn: () => getQuotation(quotationId),
  })

  if (mode === 'edit') {
    return (
      <div>
        <div className="flex items-center gap-3 mb-3">
          <p className="text-sm font-semibold text-gray-700">
            Editar cotización{' '}
            <span className="font-mono text-brand-700">{numero || `#${quotationId}`}</span>
          </p>
        </div>
        <QuoteEditForm quotationId={quotationId} mode="edit" onDone={() => setMode(null)} />
      </div>
    )
  }

  if (mode === 'new-version') {
    return (
      <div>
        <div className="flex items-center gap-2 text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 mb-4">
          <GitBranch size={13} />
          <span>Nueva versión de <strong>{numero || `#${quotationId}`}</strong> — se generará con número de versión automático y la oportunidad quedará vinculada a ella</span>
          <button onClick={() => setMode(null)} className="ml-auto text-blue-400 hover:text-blue-600"><X size={14} /></button>
        </div>
        <QuoteGenerator opp={opp} onSuccess={() => setMode(null)} />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Header row */}
      <div className="flex items-center flex-wrap gap-4">
        <div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Cotización</p>
          <div className="flex items-center gap-2">
            <p className="font-mono font-bold text-brand-700 text-sm">{numero || `#${quotationId}`}</p>
            {quote && quote.version > 1 && (
              <span className="text-[10px] font-bold bg-brand-100 text-brand-700 px-1.5 py-0.5 rounded-full">
                V{quote.version}
              </span>
            )}
          </div>
        </div>
        {quote && (
          <>
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Total</p>
              <p className="font-semibold text-emerald-700">${Number(quote.total_usd || 0).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Estado</p>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${
                quote.estado === 'aprobada' ? 'bg-green-100 text-green-700'
                : quote.estado === 'enviada' ? 'bg-blue-100 text-blue-700'
                : quote.estado === 'rechazada' ? 'bg-red-100 text-red-700'
                : 'bg-gray-100 text-gray-600'
              }`}>{quote.estado}</span>
            </div>
          </>
        )}

        {/* Action buttons */}
        <div className="flex gap-2 ml-auto flex-wrap items-center">
          <button onClick={() => setMode('edit')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 text-xs font-medium hover:bg-gray-50 transition-colors">
            <Pencil size={12} /> Editar
          </button>
          <button onClick={() => setMode('new-version')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-brand-300 text-brand-700 text-xs font-medium hover:bg-brand-50 transition-colors">
            <GitBranch size={12} /> Nueva versión
          </button>
        </div>
      </div>

      {/* Download links */}
      {quote && (
        <div className="space-y-2">
          <div className="flex gap-2 flex-wrap items-center">
            {quote.file_path_minio && (
              <a href={`/api/quotations/${quotationId}/download`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-300 text-emerald-700 text-xs font-medium hover:bg-emerald-50 transition-colors">
                <FileText size={13} /> Excel
              </a>
            )}
            {quote.file_path_carta && (
              <a href={`/api/quotations/${quotationId}/download/carta`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-300 text-blue-700 text-xs font-medium hover:bg-blue-50 transition-colors">
                <FileText size={13} /> Carta
              </a>
            )}
            {quote.file_path_cotizacion && (
              <a href={`/api/quotations/${quotationId}/download/cotizacion-word`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-brand-300 text-brand-700 text-xs font-medium hover:bg-brand-50 transition-colors">
                <FileText size={13} /> Cot.
              </a>
            )}
            {opp.file_manual_pdf ? (
              <a href={`/api/opportunities/${opp.id}/download/pdf`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-300 text-amber-700 text-xs font-medium hover:bg-amber-50 transition-colors">
                <Download size={13} /> PDF
                <span className="ml-1 text-[9px] font-bold bg-amber-200 text-amber-800 px-1 rounded">manual</span>
              </a>
            ) : quote.file_path_pdf ? (
              <a href={`/api/quotations/${quotationId}/download/pdf-combinado`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-300 text-red-600 text-xs font-medium hover:bg-red-50 transition-colors">
                <Download size={13} /> PDF
              </a>
            ) : null}
          </div>
          <ManualPdfAdjust opp={opp} />
        </div>
      )}
      {quote && <AITrace quote={quote} />}
      <VersionHistory quotationId={quotationId} />
    </div>
  )
}

// ── AI generator panel ─────────────────────────────────────────
function AIQuotePanel({ opp, onSuccess }: { opp: any; onSuccess?: () => void }) {
  const qc = useQueryClient()
  const [prompt, setPrompt] = useState('')
  const [ciudad, setCiudad] = useState('med')
  const [contacto, setContacto] = useState(opp.asesor || '')
  const [pagos, setPagos] = useState('30 días')
  const [entrega, setEntrega] = useState('')
  const [garantia, setGarantia] = useState('1 año')

  const generate = useMutation({
    mutationFn: generateQuotation,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['opportunities'] })
      qc.invalidateQueries({ queryKey: ['quotations'] })
      onSuccess?.()
    },
  })

  const handleGenerate = () => {
    if (!prompt.trim()) return
    generate.mutate({
      prompt,
      opportunity_id: opp.id,
      company_id: opp.company_id || undefined,
      business_line_id: opp.business_line_id || 1,
      ciudad_cotizacion: ciudad,
      contacto_nombre: contacto || undefined,
      asesor: opp.asesor || 'Aura María Gallego',
      condiciones_pago: pagos || undefined,
      condiciones_entrega: entrega || undefined,
      condiciones_garantia: garantia || undefined,
      landed_pct: opp.landed_pct ?? 0,
      margen_pct: opp.margen_pct ?? 0,
    })
  }

  const multiplier = (1 + (opp.landed_pct || 0) / 100) * (1 + (opp.margen_pct || 0) / 100)
  const hasAdjustment = multiplier > 1.001

  return (
    <div className="space-y-3">
      {hasAdjustment && (
        <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <span className="font-semibold">Costeo activo:</span>
          <span>Landed {opp.landed_pct}% + Margen {opp.margen_pct}% → ×{multiplier.toFixed(3)}</span>
          <span className="text-amber-500">— precios del catálogo ya incluyen este ajuste</span>
        </div>
      )}
      <textarea rows={2} value={prompt} onChange={e => setPrompt(e.target.value)}
        placeholder='Describe el requerimiento: voltaje, capacidad, conectores, condiciones...'
        className="w-full input-base resize-none text-sm" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <div>
          <label className="block text-[10px] font-semibold text-gray-400 uppercase mb-1">Ciudad</label>
          <select value={ciudad} onChange={e => setCiudad(e.target.value)} className="input-base w-full text-sm">
            {CIUDADES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-gray-400 uppercase mb-1">Contacto</label>
          <input value={contacto} onChange={e => setContacto(e.target.value)} className="input-base w-full text-sm" />
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-gray-400 uppercase mb-1">Cond. pago</label>
          <input value={pagos} onChange={e => setPagos(e.target.value)} className="input-base w-full text-sm" />
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-gray-400 uppercase mb-1">Garantía</label>
          <input value={garantia} onChange={e => setGarantia(e.target.value)} className="input-base w-full text-sm" />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button onClick={handleGenerate} disabled={generate.isPending || !prompt.trim()}
          className="btn-primary flex items-center gap-2 text-sm disabled:opacity-50">
          <Sparkles size={14} />
          {generate.isPending ? 'Generando con IA...' : 'Generar Cotización'}
        </button>
        {generate.isPending && (
          <p className="text-xs text-gray-400 animate-pulse">Consultando catálogo y generando documentos...</p>
        )}
      </div>

      {generate.isError && (
        <p className="text-sm text-red-500">Error: {(generate.error as any)?.response?.data?.detail || 'Error desconocido'}</p>
      )}
    </div>
  )
}

// ── Manual quote panel ─────────────────────────────────────────
interface ManualItem {
  referencia_usa: string; descripcion: string; referencia_cod_proveedor: string
  marca: string; cantidad: string; precio_unitario_usd: string
}
const EMPTY_ITEM: ManualItem = {
  referencia_usa: '', descripcion: '', referencia_cod_proveedor: '',
  marca: 'HOPPECKE', cantidad: '1', precio_unitario_usd: '0',
}

function ManualQuotePanel({ opp, onSuccess }: { opp: any; onSuccess?: () => void }) {
  const qc = useQueryClient()
  const [ciudad, setCiudad] = useState('med')
  const [contacto, setContacto] = useState('')
  const [pagos, setPagos] = useState('30 días')
  const [entrega, setEntrega] = useState('')
  const [garantia, setGarantia] = useState('1 año')
  const [items, setItems] = useState<ManualItem[]>([{ ...EMPTY_ITEM }])

  const multiplier = (1 + (opp.landed_pct || 0) / 100) * (1 + (opp.margen_pct || 0) / 100)
  const hasAdjustment = multiplier > 1.001

  const updateItem = (idx: number, field: keyof ManualItem, val: string) =>
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: val } : it))

  const subtotal = items.reduce((s, it) => s + (parseFloat(it.cantidad) || 0) * (parseFloat(it.precio_unitario_usd) || 0), 0)
  const total = subtotal * 1.19

  const save = useMutation({
    mutationFn: createQuotation,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['opportunities'] })
      qc.invalidateQueries({ queryKey: ['quotations'] })
      onSuccess?.()
    },
  })

  const handleSave = () => {
    save.mutate({
      opportunity_id: opp.id,
      company_id: opp.company_id || undefined,
      business_line_id: opp.business_line_id || 1,
      ciudad_cotizacion: ciudad,
      contacto_nombre: contacto || undefined,
      asesor: opp.asesor || 'Aura María Gallego',
      condiciones_pago: pagos,
      condiciones_entrega: entrega || undefined,
      condiciones_garantia: garantia,
      landed_pct: opp.landed_pct ?? 0,
      margen_pct: opp.margen_pct ?? 0,
      items: items.map(it => ({
        referencia_usa: it.referencia_usa || undefined,
        descripcion: it.descripcion,
        referencia_cod_proveedor: it.referencia_cod_proveedor || undefined,
        marca: it.marca,
        cantidad: parseFloat(it.cantidad) || 1,
        precio_unitario_usd: parseFloat(it.precio_unitario_usd) || 0,
      })),
    })
  }

  return (
    <div className="space-y-3">
      {hasAdjustment && (
        <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <span className="font-semibold">Costeo activo:</span>
          <span>Landed {opp.landed_pct}% + Margen {opp.margen_pct}% → ×{multiplier.toFixed(3)}</span>
          <span className="text-amber-500">— precios ingresados se ajustarán automáticamente</span>
        </div>
      )}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <div>
          <label className="block text-[10px] font-semibold text-gray-400 uppercase mb-1">Ciudad</label>
          <select value={ciudad} onChange={e => setCiudad(e.target.value)} className="input-base w-full text-sm">
            {CIUDADES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-gray-400 uppercase mb-1">Contacto</label>
          <input value={contacto} onChange={e => setContacto(e.target.value)} className="input-base w-full text-sm" />
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-gray-400 uppercase mb-1">Cond. pago</label>
          <input value={pagos} onChange={e => setPagos(e.target.value)} className="input-base w-full text-sm" />
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-gray-400 uppercase mb-1">Garantía</label>
          <input value={garantia} onChange={e => setGarantia(e.target.value)} className="input-base w-full text-sm" />
        </div>
      </div>

      {/* Items */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-[10px] font-semibold text-gray-400 uppercase">Ítems</p>
          <button onClick={() => setItems(p => [...p, { ...EMPTY_ITEM }])}
            className="text-xs text-brand-600 hover:text-brand-800 font-medium flex items-center gap-1">
            <Plus size={12} /> Agregar ítem
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-100">
              <tr>
                {['Ref. USA', 'Descripción *', 'Cód. SAP', 'Marca', 'Cant.', 'P. Unit. USD', ''].map(h =>
                  <th key={h} className="px-2 py-1.5 text-left font-semibold text-gray-500">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {items.map((it, idx) => (
                <tr key={idx} className="border-t border-gray-100">
                  <td className="px-1 py-1"><input value={it.referencia_usa} onChange={e => updateItem(idx, 'referencia_usa', e.target.value)} className="w-20 border border-gray-200 rounded px-1.5 py-1 text-xs" /></td>
                  <td className="px-1 py-1"><input value={it.descripcion} onChange={e => updateItem(idx, 'descripcion', e.target.value)} className="w-52 border border-gray-200 rounded px-1.5 py-1 text-xs" /></td>
                  <td className="px-1 py-1"><input value={it.referencia_cod_proveedor} onChange={e => updateItem(idx, 'referencia_cod_proveedor', e.target.value)} className="w-20 border border-gray-200 rounded px-1.5 py-1 text-xs" /></td>
                  <td className="px-1 py-1"><input value={it.marca} onChange={e => updateItem(idx, 'marca', e.target.value)} className="w-24 border border-gray-200 rounded px-1.5 py-1 text-xs" /></td>
                  <td className="px-1 py-1"><input type="number" value={it.cantidad} onChange={e => updateItem(idx, 'cantidad', e.target.value)} className="w-14 border border-gray-200 rounded px-1.5 py-1 text-xs text-right" /></td>
                  <td className="px-1 py-1"><input type="number" value={it.precio_unitario_usd} onChange={e => updateItem(idx, 'precio_unitario_usd', e.target.value)} className="w-24 border border-gray-200 rounded px-1.5 py-1 text-xs text-right" /></td>
                  <td className="px-1 py-1">
                    {items.length > 1 && (
                      <button onClick={() => setItems(p => p.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600"><X size={13} /></button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex justify-end gap-5 mt-1.5 text-xs font-medium text-gray-600">
          <span>Subtotal: <strong>${subtotal.toLocaleString('en', { minimumFractionDigits: 2 })}</strong></span>
          <span>IVA 19%: <strong>${(subtotal * 0.19).toLocaleString('en', { minimumFractionDigits: 2 })}</strong></span>
          <span className="text-emerald-700">Total: <strong>${total.toLocaleString('en', { minimumFractionDigits: 2 })}</strong></span>
        </div>
      </div>

      {save.isError && (
        <p className="text-sm text-red-500">{(save.error as any)?.response?.data?.detail || 'Error al guardar'}</p>
      )}

      <button onClick={handleSave} disabled={save.isPending || items.some(it => !it.descripcion)}
        className="btn-primary text-sm disabled:opacity-50">
        {save.isPending ? 'Guardando...' : 'Crear Cotización'}
      </button>
    </div>
  )
}

// ── Upload panel (manual Excel/PDF for complex proposals) ──────
function UploadPanel({ opp }: { opp: any }) {
  const qc = useQueryClient()
  const xlsRef = useRef<HTMLInputElement>(null)
  const pdfRef = useRef<HTMLInputElement>(null)
  const [xlsName, setXlsName] = useState<string | null>(null)
  const [pdfName, setPdfName] = useState<string | null>(null)

  const uploadXls = useMutation({
    mutationFn: (file: File) => uploadOpportunityExcel(opp.id, file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['opportunities'] })
    },
  })
  const uploadPdf = useMutation({
    mutationFn: (file: File) => uploadOpportunityPdf(opp.id, file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['opportunities'] })
    },
  })

  const handleXls = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setXlsName(file.name)
    uploadXls.mutate(file)
  }

  const handlePdf = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPdfName(file.name)
    uploadPdf.mutate(file)
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500">
        Carga archivos generados externamente para propuestas complejas. Se almacenan vinculados a esta oportunidad.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Excel upload */}
        <div className="border-2 border-dashed border-gray-200 rounded-xl p-5 hover:border-emerald-300 transition-colors">
          <div className="flex flex-col items-center gap-2 text-center">
            <FileText size={28} className="text-emerald-500" />
            <p className="text-sm font-medium text-gray-700">Propuesta Excel</p>
            <p className="text-xs text-gray-400">.xlsx, .xls</p>
            {opp.file_manual_excel && !xlsName && (
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-emerald-600 font-medium">Archivo cargado</span>
                <a href={`/api/opportunities/${opp.id}/download/excel`}
                  className="text-xs text-emerald-700 underline hover:text-emerald-900">Descargar</a>
              </div>
            )}
            {xlsName && (
              <p className="text-xs text-emerald-600 font-medium truncate max-w-full">{xlsName}</p>
            )}
            {uploadXls.isPending && <p className="text-xs text-gray-400 animate-pulse">Subiendo...</p>}
            {uploadXls.isSuccess && <p className="text-xs text-emerald-600">Guardado</p>}
            {uploadXls.isError && <p className="text-xs text-red-500">Error al subir</p>}
            <button
              onClick={() => xlsRef.current?.click()}
              className="mt-1 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-medium hover:bg-emerald-100 transition-colors">
              <Upload size={13} /> {opp.file_manual_excel ? 'Reemplazar' : 'Seleccionar archivo'}
            </button>
            <input ref={xlsRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleXls} />
          </div>
        </div>

        {/* PDF upload */}
        <div className="border-2 border-dashed border-gray-200 rounded-xl p-5 hover:border-red-300 transition-colors">
          <div className="flex flex-col items-center gap-2 text-center">
            <Download size={28} className="text-red-500" />
            <p className="text-sm font-medium text-gray-700">Propuesta PDF</p>
            <p className="text-xs text-gray-400">.pdf</p>
            {opp.file_manual_pdf && !pdfName && (
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-red-600 font-medium">Archivo cargado</span>
                <a href={`/api/opportunities/${opp.id}/download/pdf`}
                  className="text-xs text-red-700 underline hover:text-red-900">Descargar</a>
              </div>
            )}
            {pdfName && (
              <p className="text-xs text-red-600 font-medium truncate max-w-full">{pdfName}</p>
            )}
            {uploadPdf.isPending && <p className="text-xs text-gray-400 animate-pulse">Subiendo...</p>}
            {uploadPdf.isSuccess && <p className="text-xs text-red-600">Guardado</p>}
            {uploadPdf.isError && <p className="text-xs text-red-500">Error al subir</p>}
            <button
              onClick={() => pdfRef.current?.click()}
              className="mt-1 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 text-red-700 text-xs font-medium hover:bg-red-100 transition-colors">
              <Upload size={13} /> {opp.file_manual_pdf ? 'Reemplazar' : 'Seleccionar archivo'}
            </button>
            <input ref={pdfRef} type="file" accept=".pdf" className="hidden" onChange={handlePdf} />
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Expanded generator (IA / Manual / Cargar) ──────────────────
function QuoteGenerator({ opp, onSuccess }: { opp: any; onSuccess?: () => void }) {
  const [tab, setTab] = useState<'ia' | 'manual' | 'upload'>('ia')

  return (
    <div>
      <div className="flex gap-1 mb-4 border-b border-gray-200 pb-0">
        <button
          onClick={() => setTab('ia')}
          className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            tab === 'ia' ? 'border-brand-500 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}>
          <Sparkles size={14} /> Generar con IA
        </button>
        <button
          onClick={() => setTab('manual')}
          className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            tab === 'manual' ? 'border-brand-500 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}>
          <FileText size={14} /> Manual
        </button>
        <button
          onClick={() => setTab('upload')}
          className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            tab === 'upload' ? 'border-brand-500 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}>
          <Upload size={14} /> Cargar archivos
        </button>
      </div>

      {tab === 'ia' && <AIQuotePanel opp={opp} onSuccess={onSuccess} />}
      {tab === 'manual' && <ManualQuotePanel opp={opp} onSuccess={onSuccess} />}
      {tab === 'upload' && <UploadPanel opp={opp} />}
    </div>
  )
}

// ── Opportunity row (expandable) ───────────────────────────────
function OppRow({ opp, companies, businessLines, onEdit, onDelete }: {
  opp: any; companies: any[]; businessLines: any[]; onEdit: (o: any) => void; onDelete: (o: any) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const qc = useQueryClient()

  const blName = (id: number) => (businessLines as any[]).find(b => b.id === id)?.nombre ?? '—'
  const coName = (id: number) => (companies as any[]).find(c => c.id === id)?.nombre ?? '—'

  const margenDisplay = opp.margen_pct && Number(opp.margen_pct) > 0
    ? `${Number(opp.margen_pct).toFixed(0)}%`
    : null

  return (
    <>
      <tr
        className="hover:bg-gray-50 transition-colors cursor-pointer group"
        onClick={() => setExpanded(e => !e)}
      >
        <td className="px-3 py-3">
          {/* # propuesta */}
          {opp.numero_oportunidad ? (
            <span className="font-mono text-[10px] text-brand-600 font-semibold whitespace-nowrap">
              {opp.numero_oportunidad}
            </span>
          ) : (
            <span className="text-gray-300 text-xs">—</span>
          )}
        </td>
        <td className="px-3 py-3 text-gray-400 text-xs whitespace-nowrap">
          {opp.fecha_oportunidad
            ? new Date(opp.fecha_oportunidad + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: '2-digit' })
            : '—'}
        </td>
        <td className="px-3 py-3 font-medium text-gray-900 text-sm max-w-[140px] truncate">
          {coName(opp.company_id)}
        </td>
        <td className="px-3 py-3 max-w-[180px]">
          <p className="font-medium text-gray-800 truncate text-sm">{opp.titulo}</p>
        </td>
        <td className="px-3 py-3 text-xs text-gray-500 max-w-[100px] truncate">{blName(opp.business_line_id)}</td>
        <td className="px-3 py-3">
          <Badge variant={ETAPA_VARIANT[opp.etapa] || 'gray'}>{opp.etapa || '—'}</Badge>
        </td>
        <td className="px-3 py-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] text-slate-400">
              Go <span className="font-bold text-slate-600">{opp.prob_go ?? 50}%</span>
              {' · '}Get <span className="font-bold text-slate-600">{opp.prob_get ?? 50}%</span>
            </span>
            <span className={`text-xs font-bold ${probCombined(opp.prob_go ?? 50, opp.prob_get ?? 50) >= 50 ? 'text-emerald-600' : 'text-amber-500'}`}>
              {probCombined(opp.prob_go ?? 50, opp.prob_get ?? 50)}% combinada
            </span>
          </div>
        </td>
        <td className="px-3 py-3 text-sm">
          <span className="font-semibold text-emerald-700">
            {opp.valor_usd ? fmt(Number(opp.valor_usd)) : '—'}
          </span>
          {margenDisplay && (
            <span className="block text-[10px] text-amber-600 font-medium">{margenDisplay} margen</span>
          )}
        </td>
        <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
          {opp.quotation_id ? (
            <div className="flex flex-col gap-1">
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full">
                <FileText size={10} /> {opp.numero_oportunidad || `#${opp.quotation_id}`}
              </span>
              <select
                value={opp.quotation_estado || 'borrador'}
                onChange={e => updateQuotationStatus(opp.quotation_id, e.target.value).then(() => qc.invalidateQueries({ queryKey: ['opportunities'] }))}
                className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border-0 cursor-pointer w-fit ${
                  opp.quotation_estado === 'aprobada'  ? 'bg-green-100 text-green-700'
                  : opp.quotation_estado === 'enviada'   ? 'bg-blue-100 text-blue-700'
                  : opp.quotation_estado === 'rechazada' ? 'bg-red-100 text-red-600'
                  : 'bg-gray-100 text-gray-500'
                }`}>
                <option value="borrador">Borrador</option>
                <option value="enviada">Enviada</option>
                <option value="aprobada">Aprobada</option>
                <option value="rechazada">Rechazada</option>
              </select>
            </div>
          ) : (opp.file_manual_excel || opp.file_manual_pdf) ? (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">
              <Upload size={10} /> Archivo cargado
            </span>
          ) : (
            <span className="text-xs text-gray-300 italic">Sin cotización</span>
          )}
        </td>
        <td className="px-3 py-3 text-gray-500 text-xs">{opp.asesor || '—'}</td>
        <td className="px-3 py-3 w-8">
          {expanded
            ? <ChevronUp size={14} className="text-brand-400" />
            : <ChevronDown size={14} className="text-gray-300 group-hover:text-gray-400" />}
        </td>
        <td className="px-3 py-3">
          <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={e => e.stopPropagation()}>
            <button onClick={() => onEdit(opp)} className="btn-ghost p-1.5"><Pencil size={13} /></button>
            <button onClick={() => onDelete(opp)}
              className="btn-ghost p-1.5 hover:text-red-500 hover:bg-red-50"><Trash2 size={13} /></button>
          </div>
        </td>
      </tr>

      {expanded && (
        <tr>
          <td colSpan={12} className="border-b border-gray-100 bg-slate-50/70 p-0">
            <div className="px-8 py-4" onClick={e => e.stopPropagation()}>
              {opp.quotation_id ? (
                <QuotationInfo quotationId={opp.quotation_id} numero={opp.numero_oportunidad} opp={opp} />
              ) : (
                <QuoteGenerator opp={opp} />
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

// ── Create / Edit opportunity modal ───────────────────────────
const ASESORES = ['Aura María Gallego', 'Juan David Giraldo', 'Alejandro Rendón', 'Diego Arboleda']

const EMPTY_OPP = {
  company_id: '', business_line_id: '', titulo: '', descripcion: '',
  valor_usd: '', etapa: 'En Proceso', prob_go: 50, prob_get: 50,
  asesor: '', apoyo_ra: '', observaciones: '',
  fecha_oportunidad: '', landed_pct: '', margen_pct: '',
}

function OppModal({ open, onClose, editId, form, setForm, companies, businessLines, onSave, isPending }: {
  open: boolean; onClose: () => void; editId: number | null
  form: any; setForm: (f: any) => void; companies: any[]; businessLines: any[]
  onSave: () => void; isPending: boolean
}) {
  return (
    <Modal open={open} onClose={onClose}
      title={editId ? 'Editar Oportunidad' : 'Nueva Oportunidad'} width="max-w-2xl">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block text-xs font-semibold text-gray-600 mb-1">Título *</label>
          <input className="input-base" value={form.titulo}
            onChange={e => setForm({ ...form, titulo: e.target.value })} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Empresa / Cliente</label>
          <select className="input-base" value={form.company_id}
            onChange={e => setForm({ ...form, company_id: e.target.value })}>
            <option value="">— Sin empresa —</option>
            {(companies as any[]).map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Línea de Negocio</label>
          <select className="input-base" value={form.business_line_id}
            onChange={e => setForm({ ...form, business_line_id: e.target.value })}>
            <option value="">— Seleccionar —</option>
            {(businessLines as any[]).map((bl: any) => (
              <option key={bl.id} value={bl.id}>{bl.nombre}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Etapa</label>
          <select className="input-base" value={form.etapa}
            onChange={e => setForm({ ...form, etapa: e.target.value })}>
            {ETAPAS.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">
            Go — ¿el cliente ejecuta? <span className="text-slate-400 font-normal">(el proyecto sale)</span>
          </label>
          <select className="input-base" value={form.prob_go}
            onChange={e => setForm({ ...form, prob_go: parseInt(e.target.value) })}>
            {PCTS.map(p => <option key={p} value={p}>{p}%</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">
            Get — ¿lo hacen con OPEX? <span className="text-slate-400 font-normal">(si sale)</span>
          </label>
          <select className="input-base" value={form.prob_get}
            onChange={e => setForm({ ...form, prob_get: parseInt(e.target.value) })}>
            {PCTS.map(p => <option key={p} value={p}>{p}%</option>)}
          </select>
        </div>
        <div className="col-span-2 bg-slate-50 rounded-lg px-4 py-2 flex items-center gap-3">
          <span className="text-xs text-slate-500">Probabilidad combinada</span>
          <span className="text-lg font-bold text-brand-700">
            {probCombined(form.prob_go, form.prob_get)}%
          </span>
          <span className="text-xs text-slate-400">= Go {form.prob_go}% × Get {form.prob_get}% / 100</span>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Valor USD</label>
          <input className="input-base" value={form.valor_usd} type="number"
            onChange={e => setForm({ ...form, valor_usd: e.target.value })} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Asesor</label>
          <select className="input-base" value={form.asesor}
            onChange={e => setForm({ ...form, asesor: e.target.value })}>
            <option value="">— Seleccionar —</option>
            {ASESORES.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Fecha oportunidad</label>
          <input className="input-base" value={form.fecha_oportunidad} type="date"
            onChange={e => setForm({ ...form, fecha_oportunidad: e.target.value })} />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-semibold text-gray-600 mb-1">Observaciones</label>
          <textarea className="input-base" rows={2} value={form.observaciones}
            onChange={e => setForm({ ...form, observaciones: e.target.value })} />
        </div>

        {/* Internal costing */}
        <div className="col-span-2 border border-dashed border-amber-300 rounded-lg px-3 py-3 bg-amber-50">
          <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wide mb-2">
            Costeo interno — No aparece en cotizaciones
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">% Landed (importación + nacionalización)</label>
              <div className="flex items-center gap-1.5">
                <input className="input-base flex-1" value={form.landed_pct} type="number" min="0" max="100" step="0.5"
                  placeholder="ej: 18"
                  onChange={e => setForm({ ...form, landed_pct: e.target.value })} />
                <span className="text-gray-500 text-sm font-medium">%</span>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">% Margen comercial</label>
              <div className="flex items-center gap-1.5">
                <input className="input-base flex-1" value={form.margen_pct} type="number" min="0" max="100" step="0.5"
                  placeholder="ej: 25"
                  onChange={e => setForm({ ...form, margen_pct: e.target.value })} />
                <span className="text-gray-500 text-sm font-medium">%</span>
              </div>
            </div>
          </div>
          {(parseFloat(form.landed_pct) > 0 || parseFloat(form.margen_pct) > 0) && (
            <p className="text-xs text-amber-600 mt-2">
              Multiplicador efectivo: ×{((1 + (parseFloat(form.landed_pct) || 0) / 100) * (1 + (parseFloat(form.margen_pct) || 0) / 100)).toFixed(3)}{' '}
              — los precios del catálogo se ajustan al generar la cotización
            </p>
          )}
        </div>
      </div>
      <div className="flex gap-3 mt-5 pt-4 border-t border-gray-100">
        <button onClick={onSave} disabled={!form.titulo || isPending} className="btn-primary">
          {isPending ? 'Guardando...' : 'Guardar'}
        </button>
        <button onClick={onClose} className="btn-ghost">Cancelar</button>
      </div>
    </Modal>
  )
}

// ── Main page ──────────────────────────────────────────────────
export default function Pipeline({ allowedBL }: { allowedBL?: number[] }) {
  const [filter, setFilter] = useState({ etapa: '', asesor: '', business_line_id: '' })
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState<any>({ ...EMPTY_OPP })
  const [editId, setEditId] = useState<number | null>(null)
  const qc = useQueryClient()

  const params = Object.fromEntries(Object.entries(filter).filter(([, v]) => v))
  const { data: rawOpps = [], isLoading } = useQuery({
    queryKey: ['opportunities', params],
    queryFn: () => getOpportunities({ ...params, limit: 300 }),
  })
  // Filtrar oportunidades al módulo activo
  const opps = allowedBL?.length
    ? (rawOpps as any[]).filter((o: any) => allowedBL.includes(o.business_line_id))
    : rawOpps

  const { data: companies = [] } = useQuery({ queryKey: ['companies'], queryFn: () => getCompanies() })
  const { data: allBusinessLines = [] } = useQuery({ queryKey: ['business-lines'], queryFn: () => getBusinessLines() })
  // Solo mostrar BLs del módulo activo en dropdowns
  const businessLines = allowedBL?.length
    ? (allBusinessLines as any[]).filter((bl: any) => allowedBL.includes(bl.id))
    : allBusinessLines

  const save = useMutation({
    mutationFn: () => {
      const payload = {
        ...form,
        company_id: form.company_id ? parseInt(form.company_id) : null,
        business_line_id: form.business_line_id ? parseInt(form.business_line_id) : null,
        valor_usd: form.valor_usd || null,
        fecha_oportunidad: form.fecha_oportunidad || null,
        landed_pct: form.landed_pct !== '' ? parseFloat(form.landed_pct) : 0,
        margen_pct: form.margen_pct !== '' ? parseFloat(form.margen_pct) : 0,
      }
      return editId ? updateOpportunity(editId, payload) : createOpportunity(payload)
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['opportunities'] }); setModal(false) },
  })

  const remove = useMutation({
    mutationFn: deleteOpportunity,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['opportunities'] }),
  })

  const openCreate = () => {
    const defaultBL = allowedBL?.length === 1 ? String(allowedBL[0]) : ''
    setForm({ ...EMPTY_OPP, business_line_id: defaultBL })
    setEditId(null)
    setModal(true)
  }
  const openEdit = (o: any) => {
    setForm({
      company_id: o.company_id || '', business_line_id: o.business_line_id || '',
      titulo: o.titulo, descripcion: o.descripcion || '',
      valor_usd: o.valor_usd || '', etapa: o.etapa || 'En Proceso',
      prob_go: o.prob_go ?? 50, prob_get: o.prob_get ?? 50, asesor: o.asesor || '',
      apoyo_ra: o.apoyo_ra || '', observaciones: o.observaciones || '',
      fecha_oportunidad: o.fecha_oportunidad || '',
      landed_pct: o.landed_pct ?? '', margen_pct: o.margen_pct ?? '',
    })
    setEditId(o.id); setModal(true)
  }

  const activeOpps   = (opps as any[]).filter(o => o.etapa === 'En Proceso')
  const totalPipeline = activeOpps.reduce((s, o) => s + (Number(o.valor_usd) || 0), 0)
  const ponderado = activeOpps.reduce((s, o) => {
    const combined = probCombined(o.prob_go ?? 50, o.prob_get ?? 50)
    return s + (Number(o.valor_usd) || 0) * combined / 100
  }, 0)
  const won = (opps as any[]).filter(o => o.etapa === 'Won').reduce((s, o) => s + (Number(o.valor_usd) || 0), 0)
  const withQuote = (opps as any[]).filter(o => o.quotation_id).length

  return (
    <div className="p-8">
      <PageHeader
        title="Pipeline de Oportunidades"
        subtitle={`${(opps as any[]).length} oportunidades · ${fmt(totalPipeline)} activo · ${fmt(ponderado)} ponderado · ${fmt(won)} won · ${withQuote} cotizadas`}
        action={
          <button onClick={openCreate} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> Nueva Oportunidad
          </button>
        }
      />

      {/* Filters */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <select value={filter.business_line_id}
          onChange={e => setFilter({ ...filter, business_line_id: e.target.value })}
          className="input-base w-48">
          <option value="">Línea: Todas</option>
          {(businessLines as any[]).map((bl: any) => (
            <option key={bl.id} value={bl.id}>{bl.nombre}</option>
          ))}
        </select>
        <select value={filter.etapa}
          onChange={e => setFilter({ ...filter, etapa: e.target.value })}
          className="input-base w-40">
          <option value="">Etapa: Todas</option>
          {ETAPAS.map(e => <option key={e} value={e}>{e}</option>)}
        </select>
        <input placeholder="Buscar asesor..." value={filter.asesor}
          onChange={e => setFilter({ ...filter, asesor: e.target.value })}
          className="input-base w-44" />
      </div>

      {isLoading ? (
        <p className="text-gray-400">Cargando...</p>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['# Propuesta', 'Fecha', 'Cliente', 'Nombre propuesta', 'Línea', 'Etapa', 'Prob.', 'Valor USD', 'Cotización', 'Asesor', '', ''].map((h, i) => (
                  <th key={i} className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(opps as any[]).map((o: any) => (
                <OppRow
                  key={o.id}
                  opp={o}
                  companies={companies as any[]}
                  businessLines={businessLines as any[]}
                  onEdit={openEdit}
                  onDelete={(o) => { if (confirm('¿Eliminar oportunidad?')) remove.mutate(o.id) }}
                />
              ))}
              {(opps as any[]).length === 0 && (
                <tr>
                  <td colSpan={12} className="px-4 py-12 text-center text-gray-400">
                    Sin oportunidades para los filtros seleccionados
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <OppModal
        open={modal}
        onClose={() => setModal(false)}
        editId={editId}
        form={form}
        setForm={setForm}
        companies={companies as any[]}
        businessLines={businessLines as any[]}
        onSave={() => save.mutate()}
        isPending={save.isPending}
      />
    </div>
  )
}
