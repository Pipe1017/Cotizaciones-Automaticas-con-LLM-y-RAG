import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getProducts, getBusinessLines, createProduct, updateProduct, deleteProduct, updateProductPrice } from '../lib/api'
import { useState } from 'react'
import { Pencil, Check, X, Plus, Trash2 } from 'lucide-react'
import PageHeader from '../components/PageHeader'

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

function TechnicalTable({ products, onEdit, onDelete, showVoltaje }: {
  products: any[]; onEdit: (p: any) => void; onDelete: (p: any) => void; showVoltaje: boolean
}) {
  return (
    <table className="w-full text-sm">
      <thead className="bg-gray-50 border-b border-gray-100">
        <tr>
          {showVoltaje && <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Voltaje</th>}
          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Modelo</th>
          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Referencia</th>
          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Conector</th>
          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Ah</th>
          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">kWh</th>
          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">kg</th>
          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Precio €</th>
          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Precio $</th>
          <th className="px-4 py-3" />
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-50">
        {products.map(p => (
          <tr key={p.id} className="hover:bg-gray-50 transition-colors group">
            {showVoltaje && (
              <td className="px-4 py-2.5">
                <span className={`px-2 py-0.5 rounded text-xs font-bold ${VOLT_COLORS[p.voltaje] || 'bg-gray-100 text-gray-600'}`}>{p.voltaje || '—'}</span>
              </td>
            )}
            <td className="px-4 py-2.5 font-medium text-gray-900">{p.modelo_hoppecke}</td>
            <td className="px-4 py-2.5 text-gray-500 text-xs font-mono">{p.referencia_usa || '—'}</td>
            <td className="px-4 py-2.5 text-gray-500 text-xs">{p.tipo_conector || '—'}</td>
            <td className="px-4 py-2.5 text-right text-gray-700">{p.capacidad_ah || '—'}</td>
            <td className="px-4 py-2.5 text-right text-gray-600">{p.kwh || '—'}</td>
            <td className="px-4 py-2.5 text-right text-gray-600">{p.peso_kg || '—'}</td>
            <td className="px-4 py-2.5"><PriceCell product={p} field="precio_neto_eur" /></td>
            <td className="px-4 py-2.5"><PriceCell product={p} field="precio_neto_usd" /></td>
            <td className="px-4 py-2.5">
              <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                <RowActions product={p} onEdit={onEdit} onDelete={onDelete} />
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function SimpleTable({ products, onEdit, onDelete }: {
  products: any[]; onEdit: (p: any) => void; onDelete: (p: any) => void
}) {
  return (
    <table className="w-full text-sm">
      <thead className="bg-gray-50 border-b border-gray-100">
        <tr>
          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Nombre / Modelo</th>
          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Referencia</th>
          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Descripción</th>
          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Unidad</th>
          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Precio €</th>
          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Precio $</th>
          <th className="px-4 py-3" />
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-50">
        {products.map(p => (
          <tr key={p.id} className="hover:bg-gray-50 transition-colors group">
            <td className="px-4 py-2.5 font-medium text-gray-900 max-w-[200px]">{p.modelo_hoppecke}</td>
            <td className="px-4 py-2.5 text-gray-500 text-xs font-mono whitespace-nowrap">{p.referencia_usa || '—'}</td>
            <td className="px-4 py-2.5 text-gray-500 text-xs max-w-xs truncate" title={p.descripcion_comercial}>{p.descripcion_comercial || '—'}</td>
            <td className="px-4 py-2.5 text-gray-500 text-xs">{p.unidad || '—'}</td>
            <td className="px-4 py-2.5"><PriceCell product={p} field="precio_neto_eur" /></td>
            <td className="px-4 py-2.5"><PriceCell product={p} field="precio_neto_usd" /></td>
            <td className="px-4 py-2.5">
              <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                <RowActions product={p} onEdit={onEdit} onDelete={onDelete} />
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function RowActions({ product, onEdit, onDelete }: { product: any; onEdit: (p: any) => void; onDelete: (p: any) => void }) {
  return (
    <>
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

// ── Main page ──────────────────────────────────────────────────
export default function Products({ allowedBL }: { allowedBL?: number[] }) {
  const [activeBL, setActiveBL] = useState(allowedBL?.[0] ?? 1)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [confirmDelete, setConfirmDelete] = useState<any>(null)
  const qc = useQueryClient()

  const { data: rawBL = [] } = useQuery({
    queryKey: ['business-lines'],
    queryFn: getBusinessLines,
  })
  const businessLines = allowedBL
    ? (rawBL as any[]).filter((bl: any) => allowedBL.includes(bl.id))
    : rawBL

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products', activeBL, search],
    queryFn: () => getProducts({ business_line_id: activeBL, search: search || undefined, limit: 500 }),
  })

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
        subtitle={`${(products as any[]).length} referencias · Clic en precio para editar`}
      />

      {/* BL tabs */}
      <div className="flex gap-2 mb-5 flex-wrap">
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
            />
          ) : (
            <SimpleTable products={products as any[]} onEdit={openEdit} onDelete={setConfirmDelete} />
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
    </div>
  )
}
