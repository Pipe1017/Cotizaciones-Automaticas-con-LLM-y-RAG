import { Routes, Route } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import Pipeline from './pages/Pipeline'
import Companies from './pages/Companies'
import Products from './pages/Products'
import Quotations from './pages/Quotations'
import Leads from './pages/Leads'

export default function App() {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <Routes>
          <Route path="/"            element={<Dashboard />} />
          <Route path="/pipeline"   element={<Pipeline />} />
          <Route path="/companies"  element={<Companies />} />
          <Route path="/products"   element={<Products />} />
          <Route path="/quotations" element={<Quotations />} />
          <Route path="/leads"      element={<Leads />} />
        </Routes>
      </main>
    </div>
  )
}
