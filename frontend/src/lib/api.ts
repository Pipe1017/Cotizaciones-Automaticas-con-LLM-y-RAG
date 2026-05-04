import axios from 'axios'
import { useAuthStore } from '../store/auth'

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

// Adjuntar token en cada request
api.interceptors.request.use(config => {
  const token = useAuthStore.getState().token
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Si el token expiró en una llamada de datos, forzar logout
// (no aplica para descargas — esas tienen su propio catch)
api.interceptors.response.use(
  r => r,
  error => {
    const isBlob = error.config?.responseType === 'blob'
    if (error.response?.status === 401 && !isBlob) {
      useAuthStore.getState().logout()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api

// ── Companies ──────────────────────────────────────────────────
export const getCompanies = (search?: string, modulo?: string) =>
  api.get('/companies', { params: { search, modulo, limit: 300 } }).then(r => r.data)
export const createCompany = (data: object) =>
  api.post('/companies', data).then(r => r.data)
export const updateCompany = (id: number, data: object) =>
  api.put(`/companies/${id}`, data).then(r => r.data)
export const deleteCompany = (id: number) =>
  api.delete(`/companies/${id}`)

// ── Contacts ───────────────────────────────────────────────────
export const getContacts = (params?: object) =>
  api.get('/contacts', { params }).then(r => r.data)
export const getContactsByCompany = (companyId: number) =>
  api.get('/contacts', { params: { company_id: companyId, limit: 50 } }).then(r => r.data)
export const createContact = (data: object) =>
  api.post('/contacts', data).then(r => r.data)
export const updateContact = (id: number, data: object) =>
  api.put(`/contacts/${id}`, data).then(r => r.data)
export const deleteContact = (id: number) =>
  api.delete(`/contacts/${id}`)

// ── Opportunities ──────────────────────────────────────────────
export const getOpportunities = (params?: object) =>
  api.get('/opportunities', { params }).then(r => r.data)
export const createOpportunity = (data: object) =>
  api.post('/opportunities', data).then(r => r.data)
export const updateOpportunity = (id: number, data: object) =>
  api.put(`/opportunities/${id}`, data).then(r => r.data)
export const deleteOpportunity = (id: number) =>
  api.delete(`/opportunities/${id}`)
export const uploadOpportunityExcel = (id: number, file: File) => {
  const fd = new FormData(); fd.append('file', file)
  return api.post(`/opportunities/${id}/upload/excel`, fd, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data)
}
export const uploadOpportunityPdf = (id: number, file: File) => {
  const fd = new FormData(); fd.append('file', file)
  return api.post(`/opportunities/${id}/upload/pdf`, fd, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data)
}

// ── Products ───────────────────────────────────────────────────
export const getProducts = (params?: object) =>
  api.get('/products', { params }).then(r => r.data)
export const createProduct = (data: object) =>
  api.post('/products', data).then(r => r.data)
export const updateProduct = (id: number, data: object) =>
  api.put(`/products/${id}`, data).then(r => r.data)
export const deleteProduct = (id: number) =>
  api.delete(`/products/${id}`)
export const updateProductPrice = (id: number, data: object) =>
  api.patch(`/products/${id}/price`, data).then(r => r.data)

// ── Quotations ─────────────────────────────────────────────────
export const getQuotations = (params?: object) =>
  api.get('/quotations', { params }).then(r => r.data)
export const getQuotation = (id: number) =>
  api.get(`/quotations/${id}`).then(r => r.data)
// Download helpers (use as href directly for <a> tags, or call for programmatic download)
export const quotationDownloadUrl = (id: number, type: 'download' | 'download/pdf' | 'download/carta' | 'download/cotizacion-word' | 'download/pdf-combinado') =>
  `/api/quotations/${id}/${type}`
export const getQuotationItems = (id: number) =>
  api.get(`/quotations/${id}/items`).then(r => r.data)
export const generateQuotation = (data: object) =>
  api.post('/quotations/generate', data).then(r => r.data)
export const createQuotation = (data: object) =>
  api.post('/quotations', data).then(r => r.data)
export const updateQuotationStatus = (id: number, estado: string) =>
  api.patch(`/quotations/${id}/status`, null, { params: { estado } }).then(r => r.data)
export const deleteQuotation = (id: number) =>
  api.delete(`/quotations/${id}`)
export const editQuotation = (id: number, data: object) =>
  api.put(`/quotations/${id}`, data).then(r => r.data)
export const newQuotationVersion = (id: number, data: object) =>
  api.post(`/quotations/${id}/new-version`, data).then(r => r.data)

// ── Leads ──────────────────────────────────────────────────────
export const getLeads = (params?: object) =>
  api.get('/leads', { params }).then(r => r.data)
export const createLead = (data: object) =>
  api.post('/leads', data).then(r => r.data)
export const updateLead = (id: number, data: object) =>
  api.put(`/leads/${id}`, data).then(r => r.data)
export const advanceLead = (id: number, data: object) =>
  api.post(`/leads/${id}/advance`, data).then(r => r.data)
export const getLeadHistory = (id: number) =>
  api.get(`/leads/${id}/history`).then(r => r.data)

// ── Dashboard & Exchange Rates ─────────────────────────────────
export const getDashboardKpis = (business_line_id?: number) =>
  api.get('/dashboard/kpis', { params: business_line_id ? { business_line_id } : undefined }).then(r => r.data)
export const getLatestRates = () =>
  api.get('/exchange-rates/latest').then(r => r.data)
export const createExchangeRate = (data: object) =>
  api.post('/exchange-rates', data).then(r => r.data)

// ── Business Lines ─────────────────────────────────────────────
export const getBusinessLines = () =>
  api.get('/business-lines').then(r => r.data)

// ── Descarga autenticada via cookie de sesión ─────────────────
// El browser envía la cookie automáticamente — no necesita header
export const downloadFile = (path: string, filename: string) => {
  const a = document.createElement('a')
  a.href = `/api${path}`
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

// ── Proveedores ────────────────────────────────────────────────
export const getProveedores = () =>
  api.get('/proveedores').then(r => r.data)
export const createProveedor = (data: object) =>
  api.post('/proveedores', data).then(r => r.data)
export const updateProveedor = (id: number, data: object) =>
  api.put(`/proveedores/${id}`, data).then(r => r.data)
export const deleteProveedor = (id: number) =>
  api.delete(`/proveedores/${id}`)

export const duplicateProduct = (id: number) =>
  api.post(`/products/${id}/duplicate`).then(r => r.data)

export const uploadDatasheet = (productId: number, file: File) => {
  const fd = new FormData()
  fd.append('file', file)
  return api.post(`/products/${productId}/datasheet`, fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(r => r.data)
}

// ── Auth / Usuarios ────────────────────────────────────────────
export const getUsers = () =>
  api.get('/auth/users').then(r => r.data)
export const createUser = (data: object) =>
  api.post('/auth/users', data).then(r => r.data)
export const deleteUser = (id: number) =>
  api.delete(`/auth/users/${id}`)
