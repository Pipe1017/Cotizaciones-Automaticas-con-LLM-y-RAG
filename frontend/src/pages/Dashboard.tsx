import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { getDashboardKpis, getLatestRates, getBusinessLines } from '../lib/api'
import {
  TrendingUp, FileText, DollarSign, Target,
  RefreshCw, Euro, Banknote, Calendar, TrendingDown,
} from 'lucide-react'

// ── Helpers ──────────────────────────────────────────────────────────────────
// Redondea a decenas, sin decimales, sin abreviar salvo millones
const fmt = (n: number) => {
  const r = Math.round(n / 10) * 10
  if (r >= 1_000_000) return `$${(r / 1_000_000).toFixed(1)}M`
  return '$' + r.toLocaleString('en-US')
}

const BL_COLORS = ['#0f2560', '#4b60eb', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4']

const ETAPA_COLORS: Record<string, string> = {
  'En Proceso':           '#4b60eb',
  'Enviada':              '#f59e0b',
  'Ganada':               '#10b981',
  'Perdida':              '#ef4444',
  'Cancelada por Cliente':'#94a3b8',
}

// ── KPI Card ─────────────────────────────────────────────────────────────────
function KPI({ label, value, sub, icon: Icon, accent, color }: {
  label: string; value: string | number; sub?: string
  icon: any; accent?: string; color: string
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2 rounded-lg ${color}`}>
          <Icon size={18} className="text-white" />
        </div>
        {accent && (
          <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
            {accent}
          </span>
        )}
      </div>
      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">{label}</p>
      <p className="text-3xl font-bold text-slate-900 mt-1 leading-none">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-1.5">{sub}</p>}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Dashboard({ allowedBL }: { allowedBL?: number[] }) {
  const [activeBL, setActiveBL] = useState<number | null>(null)

  const { data: allBls = [] } = useQuery({
    queryKey: ['business-lines'],
    queryFn: () => getBusinessLines(),
  })

  const bls = (allowedBL?.length
    ? (allBls as any[]).filter((bl: any) => allowedBL.includes(bl.id))
    : allBls) as any[]

  const { data: kpis, isLoading, refetch } = useQuery({
    queryKey: ['kpis', activeBL],
    queryFn: () => getDashboardKpis(activeBL ?? undefined),
  })

  const { data: rates } = useQuery({
    queryKey: ['rates'],
    queryFn: () => getLatestRates(),
  })

  const totalPipeline   = kpis?.total_pipeline_usd ?? 0
  const comprometido    = kpis?.comprometido_usd ?? 0
  const margenEsperado  = kpis?.margen_esperado_usd ?? 0
  const margenGanado    = kpis?.margen_ganado_usd ?? 0
  const margenServicios = kpis?.margen_servicios_usd ?? 0
  const totalOpps       = kpis?.total_oportunidades ?? 0
  const totalQuotes     = kpis?.total_cotizaciones ?? 0
  const pct = totalPipeline > 0 ? Math.round(comprometido / totalPipeline * 100) : 0
  const margenPct = totalPipeline > 0 ? Math.round(margenEsperado / totalPipeline * 100) : 0

  const pipelineRows = ((kpis?.pipeline ?? []) as any[])
    .filter((r: any) => !allowedBL?.length || allowedBL.includes(r.bl_id))

  // Funnel — all stages present in data, plus zeroes for known stages
  const etapaMap: Record<string, number> = kpis?.oportunidades_por_etapa ?? {}
  const knownEtapas = ['En Proceso', 'Enviada', 'Ganada', 'Perdida', 'Cancelada por Cliente']
  const allEtapas = Array.from(new Set([...knownEtapas, ...Object.keys(etapaMap)]))
  const funnelData = allEtapas
    .map(e => ({ etapa: e, count: etapaMap[e] ?? 0 }))
    .filter(d => d.count > 0)
    .sort((a, b) => b.count - a.count)

  const maxFunnel = Math.max(...funnelData.map(d => d.count), 1)

  const activeName = activeBL ? bls.find((b: any) => b.id === activeBL)?.nombre : null

  return (
    <div className="p-6 space-y-6 max-w-[1400px]">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            Dashboard
            {activeName && <span className="ml-2 text-base font-medium text-slate-400">· {activeName}</span>}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">OPEX CRM · Resumen comercial</p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg px-3 py-1.5 bg-white transition-colors"
        >
          <RefreshCw size={13} /> Actualizar
        </button>
      </div>

      {/* ── BL Filter ── */}
      {bls.length > 1 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveBL(null)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
              activeBL === null
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
            }`}
          >
            Todas
          </button>
          {bls.map((bl: any) => (
            <button key={bl.id}
              onClick={() => setActiveBL(bl.id === activeBL ? null : bl.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                activeBL === bl.id
                  ? 'bg-brand-900 text-white border-brand-900'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-brand-400 hover:text-brand-700'
              }`}
            >
              {bl.nombre}
            </button>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="h-48 flex items-center justify-center text-slate-400 text-sm">Cargando…</div>
      ) : (
        <>
          {/* ── KPI Row ── */}
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <KPI label="Pipeline Total USD" value={fmt(totalPipeline)}
              sub="Oportunidades activas" icon={DollarSign}
              color="bg-brand-900" accent={pct > 0 ? `${pct}% comprometido` : undefined} />
            <KPI label="Comprometido USD" value={fmt(comprometido)}
              sub="Go × Get ponderado" icon={Target} color="bg-emerald-600" />
            <KPI label="Margen Esperado USD" value={fmt(margenEsperado)}
              sub={margenPct > 0 ? `${margenPct}% del pipeline` : 'Configura % margen en oportunidades'}
              icon={TrendingDown} color="bg-teal-600" />
            <KPI label="Margen Ganado USD" value={fmt(margenGanado)}
              sub="De oportunidades Ganadas" icon={TrendingUp} color="bg-amber-500" />
            {margenServicios > 0 && (
              <KPI label="Margen Servicios USD" value={fmt(margenServicios)}
                sub="De servicios de ingeniería activos" icon={TrendingUp} color="bg-cyan-600" />
            )}
            <KPI label="Oportunidades" value={totalOpps}
              sub="En pipeline" icon={TrendingUp} color="bg-slate-600" />
            <KPI label="Cotizaciones" value={totalQuotes}
              sub="Versiones activas" icon={FileText} color="bg-violet-600" />
          </div>

          {/* ── Tasas + Pipeline ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

            {/* Tasas de cambio */}
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 space-y-3">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">Tasas de cambio</p>
              {[
                { label: 'EUR / USD', val: rates?.EUR ? Number(rates.EUR).toFixed(4) : '—', Icon: Euro },
                { label: 'COP / USD', val: rates?.COP ? Number(rates.COP).toFixed(6) : '—', Icon: Banknote },
                { label: 'Actualización', val: rates?.fecha ?? '—', Icon: Calendar },
              ].map(r => (
                <div key={r.label} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                  <div className="flex items-center gap-2">
                    <r.Icon size={14} className="text-slate-300" />
                    <span className="text-xs text-slate-500">{r.label}</span>
                  </div>
                  <span className="text-sm font-semibold text-slate-800">{r.val}</span>
                </div>
              ))}
            </div>

            {/* Funnel etapas */}
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-4">Oportunidades por Etapa</p>
              {funnelData.length === 0 ? (
                <div className="h-32 flex items-center justify-center text-slate-300 text-sm">Sin datos</div>
              ) : (
                <div className="space-y-3">
                  {funnelData.map(d => (
                    <div key={d.etapa}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-slate-600">{d.etapa}</span>
                        <span className="text-xs font-bold text-slate-800">{d.count}</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${(d.count / maxFunnel) * 100}%`,
                            background: ETAPA_COLORS[d.etapa] ?? '#94a3b8',
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pipeline por BL mini-table */}
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-4">Pipeline por Línea (USD)</p>
              {pipelineRows.filter((r: any) => r.oportunidades > 0).length === 0 ? (
                <div className="h-32 flex items-center justify-center text-slate-300 text-sm">Sin datos</div>
              ) : (
                <div className="space-y-3">
                  {pipelineRows.filter((r: any) => r.oportunidades > 0).map((r: any, i: number) => {
                    const blPct = totalPipeline > 0 ? (r.valor_total_usd / totalPipeline) * 100 : 0
                    return (
                      <div key={r.bl_id}>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs text-slate-600 truncate max-w-[160px]">{r.linea}</span>
                          <span className="text-xs font-bold text-slate-800 ml-2 whitespace-nowrap">
                            {fmt(r.valor_total_usd)}
                            <span className="text-slate-400 font-normal ml-1">({r.oportunidades})</span>
                          </span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${blPct}%`, background: BL_COLORS[i % BL_COLORS.length] }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ── Detalle tabla ── */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-700">Detalle por Línea de Negocio <span className="text-xs font-normal text-slate-400 ml-1">— valores en USD</span></p>
              <p className="text-xs text-slate-400">{pipelineRows.length} líneas</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[540px]">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Línea de Negocio</th>
                    <th className="px-5 py-3 text-right text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Opps</th>
                    <th className="px-5 py-3 text-right text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Pipeline USD</th>
                    <th className="px-5 py-3 text-right text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Comprometido USD</th>
                    <th className="px-5 py-3 text-right text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Margen Esp. USD</th>
                    <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wide w-36">Cobertura</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {pipelineRows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-10 text-center text-slate-300 text-sm">
                        Sin oportunidades registradas
                      </td>
                    </tr>
                  ) : pipelineRows.map((row: any, i: number) => {
                    const cob = row.valor_total_usd > 0
                      ? Math.round(row.comprometido_usd / row.valor_total_usd * 100)
                      : 0
                    return (
                      <tr key={row.bl_id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-5 py-3 font-medium text-slate-800 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: BL_COLORS[i % BL_COLORS.length] }} />
                          {row.linea}
                        </td>
                        <td className="px-5 py-3 text-right text-slate-500">{row.oportunidades}</td>
                        <td className="px-5 py-3 text-right font-semibold text-slate-900">
                          {row.valor_total_usd > 0 ? fmt(row.valor_total_usd) : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-5 py-3 text-right font-medium text-emerald-700">
                          {row.comprometido_usd > 0 ? fmt(row.comprometido_usd) : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-5 py-3 text-right font-medium text-teal-700">
                          {row.margen_usd > 0 ? fmt(row.margen_usd) : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-5 py-3">
                          {row.valor_total_usd > 0 ? (
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-slate-100 rounded-full h-1.5 min-w-[60px]">
                                <div className="bg-emerald-500 h-1.5 rounded-full"
                                  style={{ width: `${Math.min(cob, 100)}%` }} />
                              </div>
                              <span className="text-xs font-semibold text-slate-500 w-8 text-right">{cob}%</span>
                            </div>
                          ) : <span className="text-slate-300">—</span>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
