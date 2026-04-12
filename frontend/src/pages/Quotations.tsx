import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getQuotations, getQuotationItems, updateQuotationStatus, getCompanies, getBusinessLines } from '../lib/api'
import { useState } from 'react'
import { FileText, Download, ChevronDown, ChevronUp } from 'lucide-react'
import PageHeader from '../components/PageHeader'

const ESTADO_COLORS: Record<string, string> = {
  borrador: 'bg-gray-100 text-gray-600',
  enviada: 'bg-blue-100 text-blue-700',
  aprobada: 'bg-green-100 text-green-700',
  rechazada: 'bg-red-100 text-red-700',
}

// ── Quotation row (expandable items) ──────────────────────────
function QuotationRow({ q, companies }: { q: any; companies: any[] }) {
  const [open, setOpen] = useState(false)
  const { data: items = [] } = useQuery({
    queryKey: ['quotation-items', q.id],
    queryFn: () => getQuotationItems(q.id),
    enabled: open,
  })
  const qc = useQueryClient()
  const changeStatus = useMutation({
    mutationFn: (estado: string) => updateQuotationStatus(q.id, estado),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['quotations'] }),
  })

  const company = companies.find(c => c.id === q.company_id)

  return (
    <>
      <tr className="hover:bg-gray-50 transition-colors cursor-pointer group"
        onClick={() => setOpen(!open)}>
        <td className="px-4 py-3 w-8">
          {open
            ? <ChevronUp size={14} className="text-brand-400" />
            : <ChevronDown size={14} className="text-gray-300 group-hover:text-gray-400" />}
        </td>
        <td className="px-4 py-3">
          <span className="font-mono font-semibold text-brand-700 text-xs">{q.numero_cotizacion}</span>
        </td>
        <td className="px-4 py-3 text-gray-600 text-sm">{company?.nombre || '—'}</td>
        <td className="px-4 py-3 text-gray-500 text-sm">{q.contacto_nombre || '—'}</td>
        <td className="px-4 py-3 text-gray-400 text-sm">{q.fecha}</td>
        <td className="px-4 py-3 font-semibold text-emerald-700 text-right text-sm">
          {q.total_usd && Number(q.total_usd) > 0 ? `$${Number(q.total_usd).toLocaleString()}` : '—'}
        </td>
        <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
          <select value={q.estado}
            onChange={e => changeStatus.mutate(e.target.value)}
            className={`text-xs font-medium px-2 py-1 rounded-full border-0 cursor-pointer focus:ring-1 focus:ring-brand-400 ${ESTADO_COLORS[q.estado] || ''}`}>
            {['borrador', 'enviada', 'aprobada', 'rechazada'].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </td>
        <td className="px-4 py-3">
          <div className="flex gap-1 flex-wrap" onClick={e => e.stopPropagation()}>
            {q.file_path_minio && (
              <a href={`/api/quotations/${q.id}/download`} title="Excel"
                className="px-2 py-1 rounded text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors">
                XLS
              </a>
            )}
            {q.file_path_carta && (
              <a href={`/api/quotations/${q.id}/download/carta`} title="Word carta"
                className="px-2 py-1 rounded text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors">
                Carta
              </a>
            )}
            {q.file_path_cotizacion && (
              <a href={`/api/quotations/${q.id}/download/cotizacion-word`} title="Word cotización"
                className="px-2 py-1 rounded text-xs font-medium text-brand-700 bg-brand-50 hover:bg-brand-100 transition-colors">
                Cot.
              </a>
            )}
            {q.file_path_pdf && (
              <a href={`/api/quotations/${q.id}/download/pdf-combinado`} title="PDF completo"
                className="px-2 py-1 rounded text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 transition-colors">
                PDF
              </a>
            )}
          </div>
        </td>
      </tr>

      {open && (
        <tr className="bg-brand-50/40">
          <td colSpan={8} className="px-8 py-4 border-b border-brand-100">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">
              Ítems de la cotización
            </p>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400">
                  {['#', 'Ref. USA', 'Descripción', 'Cód. SAP', 'Marca', 'Cant.', 'P. Unit.', 'P. Total'].map(h =>
                    <th key={h} className="pb-2 text-left font-medium">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {(items as any[]).map((it: any) => (
                  <tr key={it.id} className="border-t border-brand-100/60">
                    <td className="py-1.5 pr-3 text-gray-400">{it.item_number}</td>
                    <td className="py-1.5 pr-3 text-gray-500 font-mono text-xs">{it.referencia_usa || '—'}</td>
                    <td className="py-1.5 pr-3 font-medium text-gray-800">{it.descripcion}</td>
                    <td className="py-1.5 pr-3 text-gray-400 text-xs">{it.referencia_cod_proveedor || '—'}</td>
                    <td className="py-1.5 pr-3 text-gray-500">{it.marca}</td>
                    <td className="py-1.5 pr-3 text-right">{it.cantidad}</td>
                    <td className="py-1.5 pr-3 text-right">${Number(it.precio_unitario_usd).toLocaleString()}</td>
                    <td className="py-1.5 text-right font-semibold text-emerald-700">
                      ${Number(it.precio_total_usd).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex items-center justify-between mt-3">
              <p className="text-sm font-semibold text-gray-700">
                Total: <span className="text-emerald-700">${Number(q.total_usd || 0).toLocaleString()} USD</span>
              </p>
              {q.file_path_minio && (
                <div className="flex gap-3">
                  <a href={`/api/quotations/${q.id}/download`}
                    className="flex items-center gap-1.5 text-sm font-medium text-emerald-600 hover:text-emerald-800">
                    <FileText size={14} /> Excel
                  </a>
                  <a href={`/api/quotations/${q.id}/download/pdf`}
                    className="flex items-center gap-1.5 text-sm font-medium text-red-500 hover:text-red-700">
                    <Download size={14} /> PDF
                  </a>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

// ── Main page ──────────────────────────────────────────────────
export default function Quotations() {
  const [filterEstado, setFilterEstado] = useState('')
  const [filterBL, setFilterBL] = useState('')

  const params: Record<string, any> = {}
  if (filterEstado) params.estado = filterEstado
  if (filterBL)    params.business_line_id = parseInt(filterBL)

  const { data: quotations = [], isLoading } = useQuery({
    queryKey: ['quotations', params],
    queryFn: () => getQuotations(params),
  })
  const { data: companies = [] } = useQuery({ queryKey: ['companies'], queryFn: () => getCompanies() })
  const { data: businessLines = [] } = useQuery({ queryKey: ['business-lines'], queryFn: () => getBusinessLines() })

  return (
    <div className="p-8 space-y-5">
      <PageHeader
        title="Archivo de Cotizaciones"
        subtitle={`${(quotations as any[]).length} cotizaciones · Para generar nuevas ve al Pipeline`}
      />

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <select value={filterEstado} onChange={e => setFilterEstado(e.target.value)} className="input-base w-44">
          <option value="">Estado: Todos</option>
          {['borrador', 'enviada', 'aprobada', 'rechazada'].map(s => (
            <option key={s} value={s} className="capitalize">{s}</option>
          ))}
        </select>
        <select value={filterBL} onChange={e => setFilterBL(e.target.value)} className="input-base w-52">
          <option value="">Línea: Todas</option>
          {(businessLines as any[]).map((bl: any) => (
            <option key={bl.id} value={bl.id}>{bl.nombre}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      {isLoading ? (
        <p className="text-gray-400">Cargando...</p>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 w-8" />
                {['N° Cotización', 'Empresa', 'Contacto', 'Fecha', 'Total USD', 'Estado', 'Descargar'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(quotations as any[]).map((q: any) => (
                <QuotationRow key={q.id} q={q} companies={companies as any[]} />
              ))}
              {(quotations as any[]).length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-gray-400">
                    Sin cotizaciones.
                    {!filterEstado && !filterBL && (
                      <span> Para generar una, abre una oportunidad en el <a href="/pipeline" className="text-brand-600 hover:underline">Pipeline</a>.</span>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
