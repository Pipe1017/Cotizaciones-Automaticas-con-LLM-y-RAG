import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getProducts, getBusinessLines, createProduct, updateProduct, deleteProduct,
  updateProductPrice, getProveedores, createProveedor, updateProveedor,
  deleteProveedor, uploadDatasheet, downloadFile, duplicateProduct,
} from '../lib/api'
import { useState, useRef } from 'react'
import { Pencil, Check, X, Plus, Trash2, Link2, Download, Building2, Copy } from 'lucide-react'
import PageHeader from '../components/PageHeader'

const timeAgo = (iso: string) => {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const d = Math.floor(diff / 86400000)
  if (d === 0) return 'hoy'
  if (d === 1) return 'ayer'
  if (d < 30) return `hace ${d}d`
  return new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })
}

// ── Inline price editor ────────────────────────────────────────
function PriceCell({ product, field }: { product: any; field: 'precio_neto_eur' | 'precio_neto_usd' }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState('')
  const qc = useQueryClient()

  const save = useMutation({
    mutationFn: () => updateProductPrice(product.id, { [field]: parseFloat(val) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); setEditing(false) },
  })

  const current = product[field]
  const symbol = field === 'precio_neto_eur' ? '€' : '$'

  if (!editing) return (
    <div className="flex items-center gap-1 group">
      <span className={current ? 'font-medium text-emerald-700' : 'text-gray-300 text-xs'}>
        {current ? `${symbol}${Number(current).toLocaleString()}` : '—'}
      </span>
      <button onClick={() => { setVal(current || ''); setEditing(true) }}
        className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-400 hover:text-brand-500 transition-all">
        <Pencil size={13} />
      </button>
    </div>
  )

  return (
    <div className="flex items-center gap-1">
      <span className="text-gray-400 text-sm">{symbol}</span>
      <input autoFocus value={val} onChange={e => setVal(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') save.mutate(); if (e.key === 'Escape') setEditing(false) }}
        className="w-24 border border-brand-400 rounded px-1.5 py-0.5 text-sm focus:ring-2 focus:ring-brand-500" />
      <button onClick={() => save.mutate()} className="text-emerald-500 hover:text-emerald-700"><Check size={14} /></button>
      <button onClick={() => setEditing(false)} className="text-gray-400 hover:text-gray-600"><X size={14} /></button>
    </div>
  )
}

// ── Product form modal ─────────────────────────────────────────
const EMPTY_FORM = {
  modelo_hoppecke: '', referencia_usa: '', descripcion_comercial: '',
  unidad: 'unidad', voltaje: '', tipo_conector: '', tecnologia: '',
  codigo_sap: '', capacidad_ah: '', kwh: '', peso_kg: '',
  largo_mm: '', ancho_mm: '', altura_mm: '',
  precio_neto_eur: '', precio_neto_usd: '',
  proveedor_id: '' as string | number,
}

type FormData = typeof EMPTY_FORM

function Field({ label, name, form, setForm, type = 'text', span = false }:
  { label: string; name: keyof FormData; form: FormData; setForm: (f: FormData) => void; type?: string; span?: boolean }) {
  return (
    <div className={span ? 'col-span-2' : ''}>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input
        type={type}
        value={form[name]}
        onChange={e => setForm({ ...form, [name]: e.target.value })}
        className="input-base w-full"
      />
    </div>
  )
}

const TECHNICAL_LINES = new Set([1, 2]) // Tracción + Estacionaria

function ProductModal({
  open, onClose, blId, product,
}: {
  open: boolean; onClose: () => void; blId: number; product?: any;
}) {
  const qc = useQueryClient()
  const isEdit = !!product
  const isTechLine = TECHNICAL_LINES.has(blId)

  const { data: proveedores = [] } = useQuery({ queryKey: ['proveedores'], queryFn: getProveedores })

  const [form, setForm] = useState<FormData>(() => isEdit ? {
    modelo_hoppecke: product.modelo_hoppecke ?? '',
    referencia_usa: product.referencia_usa ?? '',
    descripcion_comercial: product.descripcion_comercial ?? '',
    unidad: product.unidad ?? 'unidad',
    voltaje: product.voltaje ?? '',
    tipo_conector: product.tipo_conector ?? '',
    tecnologia: product.tecnologia ?? '',
    codigo_sap: product.codigo_sap ?? '',
    capacidad_ah: product.capacidad_ah ?? '',
    kwh: product.kwh ?? '',
    peso_kg: product.peso_kg ?? '',
    largo_mm: product.largo_mm ?? '',
    ancho_mm: product.ancho_mm ?? '',
    altura_mm: product.altura_mm ?? '',
    precio_neto_eur: product.precio_neto_eur ?? '',
    precio_neto_usd: product.precio_neto_usd ?? '',
    proveedor_id: product.proveedor_id ?? '',
  } : EMPTY_FORM)

  const toNum = (v: string) => v === '' ? null : parseFloat(v)

  const save = useMutation({
    mutationFn: () => {
      const payload = {
        business_line_id: blId,
        modelo_hoppecke: form.modelo_hoppecke,
        referencia_usa: form.referencia_usa || null,
        descripcion_comercial: form.descripcion_comercial || null,
        unidad: form.unidad || 'unidad',
        voltaje: form.voltaje || null,
        tipo_conector: form.tipo_conector || null,
        tecnologia: form.tecnologia || null,
        codigo_sap: form.codigo_sap || null,
        capacidad_ah: toNum(form.capacidad_ah as string),
        kwh: toNum(form.kwh as string),
        peso_kg: toNum(form.peso_kg as string),
        largo_mm: toNum(form.largo_mm as string),
        ancho_mm: toNum(form.ancho_mm as string),
        altura_mm: toNum(form.altura_mm as string),
        precio_neto_eur: toNum(form.precio_neto_eur as string),
        precio_neto_usd: toNum(form.precio_neto_usd as string),
        proveedor_id: form.proveedor_id !== '' ? Number(form.proveedor_id) : null,
      }
      return isEdit ? updateProduct(product.id, payload) : createProduct(payload)
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); onClose() },
  })

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-900">{isEdit ? 'Editar producto' : 'Agregar producto'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Nombre / Modelo *" name="modelo_hoppecke" form={form} setForm={setForm} span />
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Proveedor</label>
            <select className="input-base w-full" value={form.proveedor_id}
              onChange={e => setForm({ ...form, proveedor_id: e.target.value })}>
              <option value="">— Sin proveedor —</option>
              {(proveedores as any[]).map((p: any) => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>
          </div>
          <Field label="Referencia" name="referencia_usa" form={form} setForm={setForm} />
          <Field label="Código SAP" name="codigo_sap" form={form} setForm={setForm} />
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">Descripción comercial</label>
            <textarea rows={2} value={form.descripcion_comercial}
              onChange={e => setForm({ ...form, descripcion_comercial: e.target.value })}
              className="input-base w-full resize-none" />
          </div>
          <Field label="Unidad" name="unidad" form={form} setForm={setForm} />

          {isTechLine && (
            <>
              <Field label="Voltaje" name="voltaje" form={form} setForm={setForm} />
              <Field label="Tipo conector" name="tipo_conector" form={form} setForm={setForm} />
              <Field label="Tecnología" name="tecnologia" form={form} setForm={setForm} />
            </>
          )}

          {isTechLine && (
            <div className="col-span-2 border-t pt-3 mt-1">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Especificaciones técnicas</p>
              <div className="grid grid-cols-3 gap-3">
                <Field label="Capacidad Ah" name="capacidad_ah" form={form} setForm={setForm} type="number" />
                <Field label="kWh" name="kwh" form={form} setForm={setForm} type="number" />
                <Field label="Peso kg" name="peso_kg" form={form} setForm={setForm} type="number" />
                <Field label="Largo mm" name="largo_mm" form={form} setForm={setForm} type="number" />
                <Field label="Ancho mm" name="ancho_mm" form={form} setForm={setForm} type="number" />
                <Field label="Altura mm" name="altura_mm" form={form} setForm={setForm} type="number" />
              </div>
            </div>
          )}

          <div className="col-span-2 border-t pt-3 mt-1">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Precios</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Precio neto EUR" name="precio_neto_eur" form={form} setForm={setForm} type="number" />
              <Field label="Precio neto USD" name="precio_neto_usd" form={form} setForm={setForm} type="number" />
            </div>
          </div>
        </div>

        {save.isError && (
          <p className="mt-3 text-sm text-red-500">Error al guardar. Verifica los datos.</p>
        )}

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="btn-secondary">Cancelar</button>
          <button onClick={() => save.mutate()} disabled={!form.modelo_hoppecke || save.isPending}
            className="btn-primary disabled:opacity-50">
            {save.isPending ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Agregar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Products table per BL ──────────────────────────────────────
const VOLT_COLORS: Record<string, string> = {
  '24V': 'bg-sky-100 text-sky-700',
  '36V': 'bg-violet-100 text-violet-700',
  '48V': 'bg-brand-100 text-brand-700',
  '80V': 'bg-orange-100 text-orange-700',
  '2V':  'bg-teal-100 text-teal-700',
  '12V': 'bg-green-100 text-green-700',
}

function TechnicalTable({ products, onEdit, onDelete, showVoltaje, proveedoresMap }: {
  products: any[]; onEdit: (p: any) => void; onDelete: (p: any) => void
  showVoltaje: boolean; proveedoresMap: Record<number, string>
}) {
  return (
    <table className="w-full text-sm">
      <thead className="bg-slate-800 border-b border-slate-700">
        <tr>
          {showVoltaje && <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-300 uppercase tracking-wide">Voltaje</th>}
          <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-300 uppercase tracking-wide">Modelo</th>
          <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-300 uppercase tracking-wide">Proveedor</th>
          <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-300 uppercase tracking-wide">Referencia</th>
          <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-300 uppercase tracking-wide">Conector</th>
          <th className="px-4 py-3 text-right text-[11px] font-semibold text-slate-300 uppercase tracking-wide">Ah</th>
          <th className="px-4 py-3 text-right text-[11px] font-semibold text-slate-300 uppercase tracking-wide">kWh</th>
          <th className="px-4 py-3 text-right text-[11px] font-semibold text-slate-300 uppercase tracking-wide">kg</th>
          <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-300 uppercase tracking-wide">Precio €</th>
          <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-300 uppercase tracking-wide">Precio $</th>
          <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-300 uppercase tracking-wide">Modificado</th>
          <th className="sticky right-0 bg-slate-800 px-4 py-3 w-20" />
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {products.map(p => (
          <tr key={p.id} className="hover:bg-slate-50 even:bg-slate-50/60 transition-colors group">
            {showVoltaje && (
              <td className="px-4 py-2.5">
                <span className={`px-2 py-0.5 rounded text-xs font-bold ${VOLT_COLORS[p.voltaje] || 'bg-slate-100 text-slate-600'}`}>{p.voltaje || '—'}</span>
              </td>
            )}
            <td className="px-4 py-2.5 font-semibold text-slate-800">{p.modelo_hoppecke}</td>
            <td className="px-4 py-2.5">
              <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium">
                {p.proveedor_id ? (proveedoresMap[p.proveedor_id] || '—') : '—'}
              </span>
            </td>
            <td className="px-4 py-2.5 text-slate-500 text-xs font-mono">{p.referencia_usa || '—'}</td>
            <td className="px-4 py-2.5 text-slate-500 text-xs">{p.tipo_conector || '—'}</td>
            <td className="px-4 py-2.5 text-right text-slate-700">{p.capacidad_ah || '—'}</td>
            <td className="px-4 py-2.5 text-right text-slate-600">{p.kwh || '—'}</td>
            <td className="px-4 py-2.5 text-right text-slate-600">{p.peso_kg || '—'}</td>
            <td className="px-4 py-2.5"><PriceCell product={p} field="precio_neto_eur" /></td>
            <td className="px-4 py-2.5"><PriceCell product={p} field="precio_neto_usd" /></td>
            <td className="px-4 py-2.5 text-slate-400 text-xs whitespace-nowrap">{timeAgo(p.updated_at)}</td>
            <td className="sticky right-0 bg-white group-hover:bg-slate-50 border-l border-slate-100 px-3 py-2.5 transition-colors">
              <div className="flex items-center gap-0.5">
                <DatasheetCell product={p} />
                <RowActions product={p} onEdit={onEdit} onDelete={onDelete} />
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function SimpleTable({ products, onEdit, onDelete, proveedoresMap }: {
  products: any[]; onEdit: (p: any) => void; onDelete: (p: any) => void
  proveedoresMap: Record<number, string>
}) {
  return (
    <table className="w-full text-sm">
      <thead className="bg-slate-800 border-b border-slate-700">
        <tr>
          <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-300 uppercase tracking-wide">Nombre / Modelo</th>
          <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-300 uppercase tracking-wide">Proveedor</th>
          <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-300 uppercase tracking-wide">Referencia</th>
          <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-300 uppercase tracking-wide">Descripción</th>
          <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-300 uppercase tracking-wide">Precio €</th>
          <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-300 uppercase tracking-wide">Precio $</th>
          <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-300 uppercase tracking-wide">Modificado</th>
          <th className="sticky right-0 bg-slate-800 px-4 py-3 w-20" />
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {products.map(p => (
          <tr key={p.id} className="hover:bg-slate-50 even:bg-slate-50/60 transition-colors group">
            <td className="px-4 py-2.5 font-semibold text-slate-800 max-w-[200px]">{p.modelo_hoppecke}</td>
            <td className="px-4 py-2.5">
              <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium">
                {p.proveedor_id ? (proveedoresMap[p.proveedor_id] || '—') : '—'}
              </span>
            </td>
            <td className="px-4 py-2.5 text-slate-500 text-xs font-mono whitespace-nowrap">{p.referencia_usa || '—'}</td>
            <td className="px-4 py-2.5 text-slate-500 text-xs max-w-xs truncate" title={p.descripcion_comercial}>{p.descripcion_comercial || '—'}</td>
            <td className="px-4 py-2.5"><PriceCell product={p} field="precio_neto_eur" /></td>
            <td className="px-4 py-2.5"><PriceCell product={p} field="precio_neto_usd" /></td>
            <td className="px-4 py-2.5 text-slate-400 text-xs">{timeAgo(p.updated_at)}</td>
            <td className="sticky right-0 bg-white group-hover:bg-slate-50 border-l border-slate-100 px-3 py-2.5 transition-colors">
              <div className="flex items-center gap-0.5">
                <DatasheetCell product={p} />
                <RowActions product={p} onEdit={onEdit} onDelete={onDelete} />
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function DatasheetCell({ product }: { product: any }) {
  const qc = useQueryClient()
  const ref = useRef<HTMLInputElement>(null)
  const upload = useMutation({
    mutationFn: (file: File) => uploadDatasheet(product.id, file),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  })
  const hasDoc = !!product.datasheet_path
  return (
    <div className="flex items-center gap-0.5">
      <input ref={ref} type="file" accept=".pdf,.xlsx,.docx,.jpg,.png"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) upload.mutate(f) }} />
      {hasDoc ? (
        <button
          onClick={() => downloadFile(`/products/${product.id}/datasheet`, product.datasheet_path.split('/').pop() || 'datasheet')}
          className="p-1 rounded text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
          title="Descargar datasheet">
          <Download size={13} />
        </button>
      ) : null}
      <button
        onClick={() => ref.current?.click()}
        disabled={upload.isPending}
        className={`p-1 rounded transition-colors ${
          hasDoc
            ? 'text-emerald-400 hover:text-emerald-600 hover:bg-emerald-50'
            : 'text-gray-300 hover:text-amber-500 hover:bg-amber-50'
        }`}
        title={hasDoc ? 'Reemplazar datasheet' : 'Sin datasheet — clic para subir'}>
        <Link2 size={13} />
      </button>
    </div>
  )
}

function RowActions({ product, onEdit, onDelete }: { product: any; onEdit: (p: any) => void; onDelete: (p: any) => void }) {
  const qc = useQueryClient()
  const dup = useMutation({
    mutationFn: () => duplicateProduct(product.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  })
  return (
    <>
      <button onClick={() => dup.mutate()} disabled={dup.isPending}
        title="Duplicar producto"
        className="p-1.5 rounded text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors">
        <Copy size={14} />
      </button>
      <button onClick={() => onEdit(product)}
        className="p-1.5 rounded text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-colors">
        <Pencil size={14} />
      </button>
      <button onClick={() => onDelete(product)}
        className="p-1.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
        <Trash2 size={14} />
      </button>
    </>
  )
}

// ── Tab Proveedores ────────────────────────────────────────────
function ProveedoresTab() {
  const qc = useQueryClient()
  const { data: proveedores = [] } = useQuery({ queryKey: ['proveedores'], queryFn: getProveedores })
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState({ nombre: '', pais: 'Colombia', sitio_web: '', contacto_nombre: '', contacto_email: '', notas: '' })

  const save = useMutation({
    mutationFn: () => editing ? updateProveedor(editing.id, form) : createProveedor(form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['proveedores'] }); setModal(false) },
  })
  const remove = useMutation({
    mutationFn: (id: number) => deleteProveedor(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['proveedores'] }),
  })

  const openNew = () => { setEditing(null); setForm({ nombre: '', pais: 'Colombia', sitio_web: '', contacto_nombre: '', contacto_email: '', notas: '' }); setModal(true) }
  const openEdit = (p: any) => { setEditing(p); setForm({ nombre: p.nombre, pais: p.pais || 'Colombia', sitio_web: p.sitio_web || '', contacto_nombre: p.contacto_nombre || '', contacto_email: p.contacto_email || '', notas: p.notas || '' }); setModal(true) }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button onClick={openNew} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Nuevo proveedor
        </button>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-800 border-b border-slate-700">
            <tr>
              {['Proveedor', 'País', 'Sitio web', 'Contacto', 'Email', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-slate-300 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(proveedores as any[]).map((p: any) => (
              <tr key={p.id} className="hover:bg-slate-50 even:bg-slate-50/60 transition-colors group">
                <td className="px-4 py-3 font-semibold text-slate-800">{p.nombre}</td>
                <td className="px-4 py-3 text-slate-500 text-xs">{p.pais}</td>
                <td className="px-4 py-3 text-xs">
                  {p.sitio_web ? <a href={p.sitio_web} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline">{p.sitio_web}</a> : '—'}
                </td>
                <td className="px-4 py-3 text-slate-600 text-xs">{p.contacto_nombre || '—'}</td>
                <td className="px-4 py-3 text-slate-600 text-xs">{p.contacto_email || '—'}</td>
                <td className="sticky right-0 bg-white group-hover:bg-slate-50 border-l border-slate-100 px-3 py-3 transition-colors">
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50"><Pencil size={13} /></button>
                    <button onClick={() => remove.mutate(p.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50"><Trash2 size={13} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="font-bold text-slate-800">{editing ? 'Editar proveedor' : 'Nuevo proveedor'}</h2>
            {[
              { label: 'Nombre *', key: 'nombre' },
              { label: 'País', key: 'pais' },
              { label: 'Sitio web', key: 'sitio_web' },
              { label: 'Nombre contacto', key: 'contacto_nombre' },
              { label: 'Email contacto', key: 'contacto_email' },
              { label: 'Notas', key: 'notas' },
            ].map(({ label, key }) => (
              <div key={key}>
                <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
                <input className="input-base w-full" value={(form as any)[key]}
                  onChange={e => setForm({ ...form, [key]: e.target.value })} />
              </div>
            ))}
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setModal(false)} className="btn-secondary">Cancelar</button>
              <button onClick={() => save.mutate()} disabled={!form.nombre || save.isPending} className="btn-primary">
                {save.isPending ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────
export default function Products({ allowedBL }: { allowedBL?: number[] }) {
  const [mainTab, setMainTab] = useState<'catalogo' | 'proveedores'>('catalogo')
  const [activeBL, setActiveBL] = useState(allowedBL?.[0] ?? 1)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [confirmDelete, setConfirmDelete] = useState<any>(null)
  const qc = useQueryClient()

  const { data: rawBL = [] } = useQuery({ queryKey: ['business-lines'], queryFn: getBusinessLines })
  const businessLines = allowedBL
    ? (rawBL as any[]).filter((bl: any) => allowedBL.includes(bl.id))
    : rawBL

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products', activeBL, search],
    queryFn: () => getProducts({ business_line_id: activeBL, search: search || undefined, limit: 500 }),
  })

  const { data: proveedores = [] } = useQuery({ queryKey: ['proveedores'], queryFn: getProveedores })
  const proveedoresMap: Record<number, string> = Object.fromEntries(
    (proveedores as any[]).map((p: any) => [p.id, p.nombre])
  )

  const doDelete = useMutation({
    mutationFn: (p: any) => deleteProduct(p.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); setConfirmDelete(null) },
  })

  const openCreate = () => { setEditing(null); setModalOpen(true) }
  const openEdit = (p: any) => { setEditing(p); setModalOpen(true) }
  const closeModal = () => { setModalOpen(false); setEditing(null) }

  const isTechnical = TECHNICAL_LINES.has(activeBL)

  return (
    <div className="p-8">
      <PageHeader
        title="Catálogo de Productos"
        subtitle={`${(products as any[]).length} referencias · Clic en precio para editar inline`}
      />

      {/* Main tabs: Catálogo / Proveedores */}
      <div className="flex gap-1 mb-5 border-b border-gray-200">
        {[
          { id: 'catalogo',    label: 'Catálogo' },
          { id: 'proveedores', label: 'Proveedores' },
        ].map(t => (
          <button key={t.id}
            onClick={() => setMainTab(t.id as any)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              mainTab === t.id
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            {t.id === 'proveedores' ? <span className="flex items-center gap-1.5"><Building2 size={14}/>{t.label}</span> : t.label}
          </button>
        ))}
      </div>

      {mainTab === 'proveedores' && <ProveedoresTab />}

      {mainTab === 'catalogo' && <>
      {/* BL tabs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {(businessLines as any[]).map((bl: any) => (
          <button key={bl.id}
            onClick={() => { setActiveBL(bl.id); setSearch('') }}
            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
              activeBL === bl.id
                ? 'bg-brand-600 text-white border-brand-600'
                : 'border-gray-300 text-gray-600 hover:border-brand-400'
            }`}>
            {bl.nombre}
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4">
        <input
          placeholder="Buscar modelo o descripción..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input-base w-64"
        />
        <div className="flex-1" />
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Agregar producto
        </button>
      </div>

      {/* Table */}
      {isLoading ? (
        <p className="text-gray-400 py-8 text-center">Cargando...</p>
      ) : (products as any[]).length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 py-16 text-center text-gray-400">
          <p className="text-sm">No hay productos en esta línea.</p>
          <button onClick={openCreate} className="mt-3 text-brand-600 text-sm hover:underline">+ Agregar el primero</button>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden overflow-x-auto">
          {isTechnical ? (
            <TechnicalTable
              products={products as any[]}
              onEdit={openEdit}
              onDelete={setConfirmDelete}
              showVoltaje={activeBL === 1}
              proveedoresMap={proveedoresMap}
            />
          ) : (
            <SimpleTable products={products as any[]} onEdit={openEdit} onDelete={setConfirmDelete} proveedoresMap={proveedoresMap} />
          )}
        </div>
      )}

      {/* Create / Edit modal — key forces full remount so form resets */}
      <ProductModal
        key={editing ? `edit-${editing.id}` : 'new'}
        open={modalOpen}
        onClose={closeModal}
        blId={activeBL}
        product={editing}
      />

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-80">
            <h3 className="font-semibold text-gray-900 mb-2">Eliminar producto</h3>
            <p className="text-sm text-gray-500 mb-5">
              ¿Desactivar <span className="font-medium text-gray-700">{confirmDelete.modelo_hoppecke}</span>? No aparecerá en el catálogo ni en cotizaciones.
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirmDelete(null)} className="btn-secondary">Cancelar</button>
              <button
                onClick={() => doDelete.mutate(confirmDelete)}
                disabled={doDelete.isPending}
                className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50">
                {doDelete.isPending ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
      </>}
    </div>
  )
}
