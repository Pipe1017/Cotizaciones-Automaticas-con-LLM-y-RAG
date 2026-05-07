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
    <div className="min-h-screen flex">

      {/* Panel izquierdo — marca */}
      <div className="hidden md:flex flex-col justify-between w-[420px] shrink-0 bg-brand-900 p-10">
        <div className="flex items-center gap-3">
          <div className="bg-white rounded-lg p-2">
            <img src={opexLogo} alt="OPEX SAS" className="h-8 object-contain" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">OPEX SAS</p>
            <p className="text-white/40 text-[10px] uppercase tracking-widest">Colombia</p>
          </div>
        </div>

        <div>
          <h1 className="text-white text-3xl font-bold leading-tight mb-3">
            Sistema de Gestión<br />Comercial
          </h1>
          <p className="text-white/50 text-sm leading-relaxed">
            Pipeline de oportunidades, cotizaciones automáticas con IA y seguimiento de clientes.
          </p>
        </div>

        <div className="border-t border-white/10 pt-6">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1.5 h-1.5 rounded-full bg-accent-500" />
            <span className="text-white/60 text-xs">Generación de cotizaciones con IA</span>
          </div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1.5 h-1.5 rounded-full bg-accent-500" />
            <span className="text-white/60 text-xs">Dashboard de pipeline en tiempo real</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-accent-500" />
            <span className="text-white/60 text-xs">Gestión multi-línea de negocio</span>
          </div>
        </div>
      </div>

      {/* Panel derecho — formulario */}
      <div className="flex-1 flex items-center justify-center bg-slate-50 p-8">
        <div className="w-full max-w-sm">

          {/* Logo mobile */}
          <div className="flex items-center gap-3 mb-8 md:hidden">
            <div className="bg-brand-900 rounded-lg p-2">
              <img src={opexLogo} alt="OPEX SAS" className="h-7 object-contain brightness-0 invert" />
            </div>
            <p className="font-bold text-slate-800">OPEX SAS</p>
          </div>

          <h2 className="text-2xl font-bold text-slate-900 mb-1">Iniciar sesión</h2>
          <p className="text-slate-500 text-sm mb-8">Ingresa tus credenciales para continuar</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wide">
                Usuario
              </label>
              <div className="relative">
                <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent shadow-sm"
                  placeholder="tu_usuario"
                  required
                  autoFocus
                  autoComplete="username"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wide">
                Contraseña
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent shadow-sm"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <p className="text-red-600 text-sm font-medium">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-900 hover:bg-brand-700 text-white py-3 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 shadow-sm"
            >
              {loading ? 'Verificando…' : 'Ingresar'}
            </button>
          </form>

          <p className="text-center text-slate-400 text-xs mt-8">
            OPEX SAS · CRM v1.2
          </p>
        </div>
      </div>

    </div>
  )
}
