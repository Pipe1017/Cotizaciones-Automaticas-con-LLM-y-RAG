import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CloudUpload, Play, CheckCircle, XCircle, Clock, RefreshCw, AlertTriangle, Terminal, RotateCcw, Database, FolderOpen } from 'lucide-react'
import api from '../lib/api'

// ── API ───────────────────────────────────────────────────────────────────────
const getConfig        = () => api.get('/backup/config').then(r => r.data)
const getRemotes       = () => api.get('/backup/remotes').then(r => r.data)
const getLogs          = () => api.get('/backup/logs').then(r => r.data)
const saveConfig       = (d: any) => api.put('/backup/config', d).then(r => r.data)
const runBackup        = () => api.post('/backup/run').then(r => r.data)
const listRestorePoints = () => api.get('/backup/restore/list').then(r => r.data)
const restoreDb        = (filename: string) => api.post('/backup/restore/db', { filename }).then(r => r.data)
const restoreFiles     = () => api.post('/backup/restore/files').then(r => r.data)

const HOURS = Array.from({ length: 24 }, (_, i) => i)

function StatusBadge({ status }: { status?: string }) {
  if (!status) return <span className="text-slate-300 text-xs">—</span>
  const map: Record<string, string> = {
    ok:      'bg-emerald-50 text-emerald-700 border-emerald-200',
    error:   'bg-red-50 text-red-600 border-red-200',
    running: 'bg-amber-50 text-amber-600 border-amber-200',
  }
  const icons: Record<string, React.ReactNode> = {
    ok:      <CheckCircle size={11} />,
    error:   <XCircle size={11} />,
    running: <RefreshCw size={11} className="animate-spin" />,
  }
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${map[status] ?? 'bg-slate-50 text-slate-500 border-slate-200'}`}>
      {icons[status]} {status}
    </span>
  )
}

export default function Backup() {
  const qc = useQueryClient()
  const { data: config, isLoading } = useQuery({ queryKey: ['backup-config'], queryFn: getConfig })
  const { data: remotesData } = useQuery({ queryKey: ['backup-remotes'], queryFn: getRemotes })
  const { data: logs = [] } = useQuery({ queryKey: ['backup-logs'], queryFn: getLogs, refetchInterval: 5000 })

  const [form, setForm] = useState({
    rclone_remote: '', remote_path: 'OPEX-Backup',
    include_db: true, include_files: true,
    schedule_hour: 2, enabled: false,
  })
  const [showLog, setShowLog] = useState<number | null>(null)
  const [selectedDump, setSelectedDump] = useState<string | null>(null)
  const [confirmRestore, setConfirmRestore] = useState<'db' | 'files' | null>(null)

  const { data: restorePoints = [], refetch: fetchRestorePoints, isFetching: loadingPoints } = useQuery({
    queryKey: ['restore-points'],
    queryFn: listRestorePoints,
    enabled: false,
  })

  const restoreDbMut = useMutation({
    mutationFn: (filename: string) => restoreDb(filename),
    onSuccess: () => setConfirmRestore(null),
  })
  const restoreFilesMut = useMutation({
    mutationFn: restoreFiles,
    onSuccess: () => setConfirmRestore(null),
  })

  useEffect(() => {
    if (config) setForm({
      rclone_remote:  config.rclone_remote ?? '',
      remote_path:    config.remote_path ?? 'OPEX-Backup',
      include_db:     config.include_db ?? true,
      include_files:  config.include_files ?? true,
      schedule_hour:  config.schedule_hour ?? 2,
      enabled:        config.enabled ?? false,
    })
  }, [config])

  const save = useMutation({
    mutationFn: saveConfig,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['backup-config'] }),
  })

  const run = useMutation({
    mutationFn: runBackup,
    onSuccess: () => {
      setTimeout(() => qc.invalidateQueries({ queryKey: ['backup-logs'] }), 1000)
      setTimeout(() => qc.invalidateQueries({ queryKey: ['backup-config'] }), 3000)
    },
  })

  const remotes: string[] = remotesData?.remotes ?? []
  const rcloneInstalled: boolean = remotesData?.rclone_installed ?? false

  if (isLoading) return <div className="p-6 text-slate-400">Cargando…</div>

  return (
    <div className="p-6 max-w-3xl space-y-6">

      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <CloudUpload size={20} className="text-brand-700" /> Backup en la Nube
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">Sincronización automática de BD y archivos via rclone</p>
      </div>

      {/* Setup rclone — instrucciones si no hay remotes */}
      {!rcloneInstalled || remotes.length === 0 ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className="text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-amber-800 text-sm mb-2">
                {!rcloneInstalled ? 'rclone no detectado en el servidor' : 'Sin remotes configurados — paso único en el servidor'}
              </p>
              <p className="text-xs text-amber-700 mb-3">
                Ejecuta estos comandos en el servidor Ubuntu (solo una vez). Necesitas acceso por AnyDesk o SSH:
              </p>
              <div className="bg-slate-900 rounded-lg p-4 font-mono text-xs text-emerald-400 space-y-1.5">
                <p className="text-slate-400"># Configurar Google Drive (abre enlace en tu navegador)</p>
                <p>docker compose exec backend rclone config</p>
                <p className="text-slate-400 mt-2"># Nombre sugerido: <span className="text-white">gdrive</span></p>
                <p className="text-slate-400"># Tipo: <span className="text-white">Google Drive</span></p>
                <p className="text-slate-400"># Sigue el asistente → autoriza en el navegador</p>
              </div>
              <p className="text-xs text-amber-600 mt-3">
                Una vez configurado, recarga esta página y aparecerá el remote en el selector.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {/* Configuración */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 space-y-5">
        <p className="text-sm font-semibold text-slate-700">Configuración</p>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              Remote rclone
            </label>
            {remotes.length > 0 ? (
              <select
                value={form.rclone_remote}
                onChange={e => setForm({ ...form, rclone_remote: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="">— Seleccionar —</option>
                {remotes.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            ) : (
              <input
                value={form.rclone_remote}
                onChange={e => setForm({ ...form, rclone_remote: e.target.value })}
                placeholder="ej: gdrive"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              Carpeta destino
            </label>
            <input
              value={form.remote_path}
              onChange={e => setForm({ ...form, remote_path: e.target.value })}
              placeholder="ej: OPEX-Backup"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>

        {/* Qué incluir */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
            Incluir en el backup
          </label>
          <div className="flex gap-4">
            {[
              { key: 'include_db',    label: 'Base de datos (SQL)', desc: 'Oportunidades, clientes, catálogo, usuarios' },
              { key: 'include_files', label: 'Archivos MinIO',      desc: 'PDFs, Excels, datasheets generados' },
            ].map(({ key, label, desc }) => (
              <label key={key} className={`flex-1 flex items-start gap-3 border rounded-xl p-3 cursor-pointer transition-all ${
                (form as any)[key] ? 'border-brand-300 bg-brand-50/50' : 'border-slate-200 bg-white'
              }`}>
                <input type="checkbox" checked={(form as any)[key]}
                  onChange={e => setForm({ ...form, [key]: e.target.checked })}
                  className="mt-0.5 accent-brand-600" />
                <div>
                  <p className="text-xs font-semibold text-slate-700">{label}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Horario */}
        <div className="grid grid-cols-2 gap-4 items-end">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              Hora automática (UTC)
            </label>
            <select
              value={form.schedule_hour}
              onChange={e => setForm({ ...form, schedule_hour: parseInt(e.target.value) })}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {HOURS.map(h => (
                <option key={h} value={h}>{String(h).padStart(2, '0')}:00 UTC</option>
              ))}
            </select>
          </div>

          <label className={`flex items-center gap-3 border rounded-xl px-4 py-2.5 cursor-pointer transition-all ${
            form.enabled ? 'border-emerald-300 bg-emerald-50/50' : 'border-slate-200 bg-white'
          }`}>
            <input type="checkbox" checked={form.enabled}
              onChange={e => setForm({ ...form, enabled: e.target.checked })}
              className="accent-emerald-600" />
            <div>
              <p className="text-xs font-semibold text-slate-700">Backup automático activo</p>
              <p className="text-[11px] text-slate-400">Corre cada día a la hora configurada</p>
            </div>
          </label>
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
          <button
            onClick={() => save.mutate(form)}
            disabled={save.isPending}
            className="bg-brand-900 hover:bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-40 transition-colors"
          >
            {save.isPending ? 'Guardando…' : 'Guardar configuración'}
          </button>

          <button
            onClick={() => run.mutate()}
            disabled={run.isPending || !form.rclone_remote || !form.remote_path}
            className="flex items-center gap-2 border border-emerald-300 text-emerald-700 hover:bg-emerald-50 px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-40 transition-colors"
          >
            <Play size={14} />
            {run.isPending ? 'Iniciando…' : 'Ejecutar ahora'}
          </button>

          {save.isSuccess && (
            <span className="text-xs text-emerald-600 flex items-center gap-1">
              <CheckCircle size={12} /> Guardado
            </span>
          )}
          {run.isSuccess && (
            <span className="text-xs text-emerald-600 flex items-center gap-1">
              <CheckCircle size={12} /> Backup iniciado en background
            </span>
          )}
        </div>
      </div>

      {/* Último backup */}
      {config?.last_run_at && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
          <p className="text-sm font-semibold text-slate-700 mb-3">Último backup</p>
          <div className="flex items-center gap-4">
            <StatusBadge status={config.last_run_status} />
            <span className="text-xs text-slate-500 flex items-center gap-1">
              <Clock size={11} />
              {new Date(config.last_run_at).toLocaleString('es-CO')}
            </span>
          </div>
          {config.last_run_log && (
            <pre className="mt-3 bg-slate-50 rounded-lg p-3 text-[11px] font-mono text-slate-600 overflow-y-auto max-h-32 whitespace-pre-wrap">
              {config.last_run_log}
            </pre>
          )}
        </div>
      )}

      {/* Historial */}
      {(logs as any[]).length > 0 && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100">
            <p className="text-sm font-semibold text-slate-700">Historial de backups</p>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-800">
              <tr>
                {['Fecha', 'Estado', 'Tamaño', 'Log'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-slate-300 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(logs as any[]).map((l: any) => (
                <tr key={l.id} className="hover:bg-slate-50 even:bg-slate-50/60">
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {new Date(l.started_at).toLocaleString('es-CO')}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={l.status} /></td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {l.size_mb ? `${l.size_mb} MB` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {l.log && (
                      <button
                        onClick={() => setShowLog(showLog === l.id ? null : l.id)}
                        className="flex items-center gap-1 text-xs text-brand-600 hover:underline"
                      >
                        <Terminal size={11} /> {showLog === l.id ? 'Ocultar' : 'Ver log'}
                      </button>
                    )}
                    {showLog === l.id && (
                      <pre className="mt-2 bg-slate-50 rounded p-2 text-[11px] font-mono text-slate-600 whitespace-pre-wrap max-h-40 overflow-y-auto">
                        {l.log}
                      </pre>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {/* ── Restaurar ── */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <RotateCcw size={15} className="text-red-500" /> Restaurar desde backup
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">Reemplaza los datos actuales con un backup guardado en Google Drive</p>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-xs text-red-700">
          <strong>⚠️ Advertencia:</strong> La restauración reemplaza TODOS los datos actuales (clientes, oportunidades, cotizaciones). Esta acción no se puede deshacer.
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Restaurar BD */}
          <div className="border border-slate-200 rounded-xl p-4 space-y-3">
            <p className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <Database size={13} /> Base de datos
            </p>
            <button
              onClick={() => fetchRestorePoints()}
              disabled={loadingPoints}
              className="flex items-center gap-1.5 text-xs text-brand-700 hover:underline disabled:opacity-40"
            >
              <RefreshCw size={11} className={loadingPoints ? 'animate-spin' : ''} />
              {loadingPoints ? 'Buscando…' : 'Listar backups disponibles'}
            </button>

            {(restorePoints as any[]).length > 0 && (
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {(restorePoints as any[]).map((p: any) => (
                  <label key={p.filename} className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-xs transition-all ${
                    selectedDump === p.filename ? 'border-brand-400 bg-brand-50' : 'border-slate-100 hover:border-slate-300'
                  }`}>
                    <input type="radio" name="dump" checked={selectedDump === p.filename}
                      onChange={() => setSelectedDump(p.filename)} className="accent-brand-600" />
                    <div>
                      <p className="font-mono text-slate-700">{p.filename}</p>
                      {p.date && <p className="text-slate-400 text-[10px]">{p.date}</p>}
                    </div>
                  </label>
                ))}
              </div>
            )}

            <button
              onClick={() => setConfirmRestore('db')}
              disabled={!selectedDump}
              className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold py-2 rounded-lg disabled:opacity-30 transition-colors"
            >
              <RotateCcw size={12} /> Restaurar BD seleccionada
            </button>
          </div>

          {/* Restaurar archivos */}
          <div className="border border-slate-200 rounded-xl p-4 space-y-3">
            <p className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <FolderOpen size={13} /> Archivos (PDFs, Excels)
            </p>
            <p className="text-xs text-slate-400">
              Sincroniza los archivos MinIO desde el último backup en Google Drive.
            </p>
            <button
              onClick={() => setConfirmRestore('files')}
              className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold py-2 rounded-lg transition-colors"
            >
              <RotateCcw size={12} /> Restaurar archivos
            </button>
            {restoreFilesMut.isSuccess && (
              <p className="text-xs text-emerald-600 flex items-center gap-1">
                <CheckCircle size={11} /> Restauración iniciada en background
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Modal de confirmación */}
      {confirmRestore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <h3 className="font-semibold text-slate-800 text-lg">¿Confirmar restauración?</h3>
            <p className="text-sm text-slate-500">
              {confirmRestore === 'db'
                ? `Se restaurará la base de datos desde "${selectedDump}". Todos los datos actuales serán reemplazados.`
                : 'Se sincronizarán los archivos MinIO desde el último backup. Los archivos actuales serán reemplazados.'}
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  if (confirmRestore === 'db' && selectedDump) restoreDbMut.mutate(selectedDump)
                  if (confirmRestore === 'files') restoreFilesMut.mutate()
                }}
                disabled={restoreDbMut.isPending || restoreFilesMut.isPending}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-lg text-sm font-semibold disabled:opacity-40"
              >
                {restoreDbMut.isPending || restoreFilesMut.isPending ? 'Iniciando…' : 'Sí, restaurar'}
              </button>
              <button onClick={() => setConfirmRestore(null)}
                className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-lg text-sm font-semibold hover:bg-slate-50">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
