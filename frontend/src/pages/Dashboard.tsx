import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { getDashboardKpis, getLatestRates, getBusinessLines } from '../lib/api'
import {
  TrendingUp, FileText, DollarSign, Target, Activity,
  RefreshCw, Euro, Banknote, Calendar,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts'

// ── Palette for BL bars ──────────────────────────────────────────────────────
const BL_COLORS = ['#4b60eb', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4']

const ETAPA_ORDER = [
  'En Proceso', 'Cotizando', 'Enviada', 'Ganada', 'Perdida', 'Cancelada por Cliente',
]


// ── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M`
  : n >= 1_000   ? `$${(n / 1_000).toFixed(0)}K`
  : `$${n.toFixed(0)}`

// ── KPI Card ─────────────────────────────────────────────────────────────────
function KPI({
  label, value, sub, icon: Icon, color, accent,
}: {
  label: string; value: string | number; sub?: string
  icon: any; color: string; accent?: string
}) {
  return (
    <div className="card p-5 flex gap-4 items-start">
      <div className={`p-2.5 rounded-xl ${color} shrink-0`}>
        <Icon size={20} className="text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide truncate">{label}</p>
        <p className="text-2xl font-bold text-gray-900 leading-tight mt-0.5">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
      {accent && (
        <div className="ml-auto shrink-0">
          <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">{accent}</span>
        </div>
      )}
    </div>
  )
}

// ── Business Line filter pill ─────────────────────────────────────────────────
function BLPill({ id, nombre, active, onClick }: { id: number | null; nombre: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
        active
          ? 'bg-brand-500 text-white border-brand-500 shadow-sm'
          : 'bg-white text-gray-600 border-gray-200 hover:border-brand-400 hover:text-brand-600'
      }`}
    >
      {nombre}
    </button>
  )
}

// ── Section header ────────────────────────────────────────────────────────────
function SectionHeader({ title }: { title: string }) {
  return (
    <h3 className="text-sm font-semibold text-gray-700 mb-3">{title}</h3>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Dashboard({ allowedBL }: { allowedBL?: number[] }) {
  const [activeBL, setActiveBL] = useState<number | null>(null)

  const { data: allBls = [] } = useQuery({
    queryKey: ['business-lines'],
    queryFn: () => getBusinessLines(),
  })

  // Solo mostrar las BLs permitidas por el módulo activo
  const bls = allowedBL?.length
    ? (allBls as any[]).filter((bl: any) => allowedBL.includes(bl.id))
    : allBls

  const { data: kpis, isLoading, refetch } = useQuery({
    queryKey: ['kpis', activeBL],
    queryFn: () => getDashboardKpis(activeBL ?? undefined),
  })

  const { data: rates } = useQuery({
    queryKey: ['rates'],
    queryFn: () => getLatestRates(),
  })

  // Derived numbers
  const totalPipeline = kpis?.total_pipeline_usd ?? 0
  const comprometido  = kpis?.comprometido_usd ?? 0
  const totalOpps     = kpis?.total_oportunidades ?? 0
  const totalQuotes   = kpis?.total_cotizaciones ?? 0
  const totalLeads    = kpis?.total_leads ?? 0
  const pct = totalPipeline > 0 ? Math.round(comprometido / totalPipeline * 100) : 0

  // Pipeline chart data — solo BLs del módulo con oportunidades
  const pipelineData = (kpis?.pipeline ?? [])
    .filter((r: any) => r.oportunidades > 0)
    .filter((r: any) => !allowedBL?.length || allowedBL.includes(r.bl_id))

  // Opportunity funnel
  const funnelData = ETAPA_ORDER
    .map(e => ({ etapa: e, count: (kpis?.oportunidades_por_etapa ?? {})[e] ?? 0 }))
    .filter(d => d.count > 0)


  return (
    <div className="p-8 space-y-7 max-w-[1400px]">

      {/* ── Header row ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            OPEX CRM · Resumen comercial {activeBL
              ? `— ${(bls as any[]).find(b => b.id === activeBL)?.nombre}`
              : '— Todas las líneas'}
          </p>
        </div>
        <button onClick={() => refetch()} className="btn-ghost">
          <RefreshCw size={14} />
          Actualizar
        </button>
      </div>

      {/* ── BL Filter ── */}
      <div className="flex flex-wrap gap-2">
        <BLPill id={null} nombre="Todas las líneas" active={activeBL === null} onClick={() => setActiveBL(null)} />
        {(bls as any[]).map((bl: any) => (
          <BLPill key={bl.id} id={bl.id} nombre={bl.nombre} active={activeBL === bl.id} onClick={() => setActiveBL(bl.id === activeBL ? null : bl.id)} />
        ))}
      </div>

      {isLoading ? (
        <div className="h-48 flex items-center justify-center text-gray-400">Cargando KPIs...</div>
      ) : (
        <>
          {/* ── KPI Row ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KPI
              label="Pipeline Total"
              value={fmt(totalPipeline)}
              sub="USD acumulado"
              icon={DollarSign}
              color="bg-brand-500"
              accent={`${pct}% comprometido`}
            />
            <KPI
              label="Comprometido"
              value={fmt(comprometido)}
              sub="Alta probabilidad"
              icon={Target}
              color="bg-emerald-500"
            />
            <KPI
              label="Oportunidades"
              value={totalOpps}
              sub="En pipeline activo"
              icon={TrendingUp}
              color="bg-amber-500"
            />
            <KPI
              label="Cotizaciones"
              value={totalQuotes}
              sub={`${totalLeads} leads en desarrollo`}
              icon={FileText}
              color="bg-violet-500"
            />
          </div>

          {/* ── Exchange rates ── */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'EUR / USD', val: rates?.EUR ? Number(rates.EUR).toFixed(4) : '—', Icon: Euro },
              { label: 'COP / USD', val: rates?.COP ? Number(rates.COP).toFixed(6) : '—', Icon: Banknote },
              { label: 'Actualización', val: rates?.fecha ?? '—', Icon: Calendar },
            ].map(r => (
              <div key={r.label} className="card px-5 py-3.5 flex justify-between items-center">
                <div>
                  <p className="text-xs text-gray-500 font-medium">{r.label}</p>
                  <p className="text-lg font-bold text-gray-900 mt-0.5">{r.val}</p>
                </div>
                <r.Icon size={20} className="text-gray-300" />
              </div>
            ))}
          </div>

          {/* ── Charts row ── */}
          <div className="grid grid-cols-1 gap-5">

            {/* Pipeline por línea */}
            <div className="card p-5">
              <SectionHeader title="Pipeline por Línea de Negocio (USD)" />
              {pipelineData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={pipelineData} margin={{ left: -5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="linea" tick={{ fontSize: 10 }} tickLine={false} axisLine={false}
                      tickFormatter={v => v.split(' ').slice(0, 2).join(' ')} />
                    <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false}
                      tickFormatter={v => `$${(v / 1000).toFixed(0)}K`} />
                    <Tooltip
                      formatter={(v: any) => [`$${Number(v).toLocaleString()}`, 'Pipeline USD']}
                      contentStyle={{ border: 'none', borderRadius: 8, boxShadow: '0 4px 12px rgb(0,0,0,0.1)', fontSize: 12 }}
                    />
                    <Bar dataKey="valor_total_usd" radius={[4, 4, 0, 0]} maxBarSize={56}>
                      {pipelineData.map((_: any, i: number) => (
                        <Cell key={i} fill={BL_COLORS[i % BL_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-52 flex items-center justify-center">
                  <p className="text-gray-400 text-sm">Sin datos de pipeline para esta línea</p>
                </div>
              )}
            </div>

          </div>

          {/* ── Funnel + Pipeline table ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

            {/* Opportunity funnel */}
            <div className="card p-5">
              <SectionHeader title="Funnel Oportunidades por Etapa" />
              {funnelData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={funnelData} layout="vertical" margin={{ left: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis type="category" dataKey="etapa" tick={{ fontSize: 10 }} width={80} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{ border: 'none', borderRadius: 8, boxShadow: '0 4px 12px rgb(0,0,0,0.1)', fontSize: 12 }}
                    />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]} fill="#8b5cf6" maxBarSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-48 flex items-center justify-center">
                  <p className="text-gray-400 text-sm">Sin oportunidades</p>
                </div>
              )}
            </div>

            {/* Pipeline detail table (2 cols wide) */}
            <div className="card overflow-hidden lg:col-span-2">
              <div className="px-5 py-3.5 border-b border-gray-100">
                <p className="text-sm font-semibold text-gray-700">Detalle Pipeline por Línea</p>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {['Línea', 'Opps', 'Pipeline USD', 'Comprometido', 'Cobertura'].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {(kpis?.pipeline ?? [])
                    .filter((r: any) => r.oportunidades > 0)
                    .filter((r: any) => !allowedBL?.length || allowedBL.includes(r.bl_id))
                    .map((row: any) => {
                    const pct = row.valor_total_usd > 0
                      ? (row.comprometido_usd / row.valor_total_usd * 100)
                      : 0
                    return (
                      <tr key={row.linea} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5 font-medium text-gray-900 text-xs">{row.linea}</td>
                        <td className="px-4 py-2.5 text-gray-500">{row.oportunidades}</td>
                        <td className="px-4 py-2.5 font-semibold">
                          {row.valor_total_usd > 0 ? fmt(row.valor_total_usd) : '—'}
                        </td>
                        <td className="px-4 py-2.5 text-emerald-700 font-medium">
                          {row.comprometido_usd > 0 ? fmt(row.comprometido_usd) : '—'}
                        </td>
                        <td className="px-4 py-2.5 w-32">
                          {row.valor_total_usd > 0 ? (
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                                <div
                                  className="bg-emerald-500 h-1.5 rounded-full"
                                  style={{ width: `${Math.min(pct, 100)}%` }}
                                />
                              </div>
                              <span className="text-xs text-gray-500 w-9 text-right">{pct.toFixed(0)}%</span>
                            </div>
                          ) : '—'}
                        </td>
                      </tr>
                    )
                  })}
                  {(kpis?.pipeline ?? []).filter((r: any) => r.oportunidades > 0).length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-gray-400 text-sm">
                        Sin oportunidades para los filtros seleccionados
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
