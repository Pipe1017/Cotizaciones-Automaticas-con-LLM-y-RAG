import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { Lock, User } from 'lucide-react'
import { useAuthStore } from '../store/auth'
import opexLogo from '../logo/Opex.png'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const login    = useAuthStore(s => s.login)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const form = new URLSearchParams()
      form.append('username', username)
      form.append('password', password)
      const { data } = await axios.post('/api/auth/login', form)
      login(data.access_token, { username, nombre: data.nombre, rol: data.rol })
      navigate('/', { replace: true })
    } catch {
      setError('Usuario o contraseña incorrectos')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-brand-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.4)] overflow-hidden">

          {/* Header navy con logo */}
          <div className="bg-brand-900 px-8 pt-8 pb-6 flex flex-col items-center border-b-4 border-accent-500">
            <img src={opexLogo} alt="OPEX SAS" className="h-12 object-contain brightness-0 invert mb-3" />
            <p className="text-accent-400 text-xs font-semibold tracking-widest uppercase">Sistema de Gestión Comercial</p>
          </div>

          <div className="px-8 py-7">
            <h1 className="text-base font-bold text-slate-800 mb-5">Iniciar sesión</h1>

          <form onSubmit={handleSubmit} className="space-y-4 mb-0">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                Usuario
              </label>
              <div className="relative">
                <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 border border-surface-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  placeholder="tu_usuario"
                  required
                  autoFocus
                  autoComplete="username"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                Contraseña
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 border border-surface-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
              </div>
            </div>

            {error && (
              <p className="text-red-500 text-xs text-center bg-red-50 rounded-lg py-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-900 hover:bg-brand-700 text-white py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {loading ? 'Verificando…' : 'Ingresar'}
            </button>
          </form>
          </div>
        </div>

        <p className="text-center text-white/40 text-xs mt-5">
          OPEX SAS · CRM v1.2
        </p>
      </div>
    </div>
  )
}
