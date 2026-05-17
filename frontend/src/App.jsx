// App.jsx — Root Router
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import EngineerDashboard from './pages/EngineerDashboard'
import OperatorDashboard from './pages/OperatorDashboard'
import Admin from './pages/Admin'
import ComponentsDashboard from './pages/ComponentsDashboard'
import ComponentDetail from './pages/ComponentDetail'
import NotFound from './pages/NotFound'
import useAuthStore from './state/authStore'

function ProtectedRoute({ children, requiredRole }) {
  const { token, user } = useAuthStore()
  if (!token) return <Navigate to="/login" replace />
  if (requiredRole && user?.role !== requiredRole && user?.role !== 'admin') {
    return <Navigate to="/operator" replace />
  }
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login"    element={<Login />} />
        <Route path="/engineer" element={
          <ProtectedRoute requiredRole="engineer">
            <EngineerDashboard />
          </ProtectedRoute>
        } />
        <Route path="/operator" element={
          <ProtectedRoute>
            <OperatorDashboard />
          </ProtectedRoute>
        } />
        <Route path="/admin" element={
          <ProtectedRoute requiredRole="admin">
            <Admin />
          </ProtectedRoute>
        } />
        
        {/* Component / Fleet Dashboard */}
        <Route path="/components" element={
          <ProtectedRoute>
            <ComponentsDashboard />
          </ProtectedRoute>
        } />
        <Route path="/components/:id" element={
          <ProtectedRoute>
            <ComponentDetail />
          </ProtectedRoute>
        } />

        {/* Default redirect */}
        <Route path="/"  element={<Navigate to="/login" replace />} />
        <Route path="*"  element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  )
}
