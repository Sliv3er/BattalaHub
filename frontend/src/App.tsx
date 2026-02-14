import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'
import { useSocketStore } from './stores/socketStore'
import AuthPage from './pages/AuthPage'
import DashboardPage from './pages/DashboardPage'
import LoadingSpinner from './components/LoadingSpinner'
import { useEffect } from 'react'

function App() {
  const { user, isLoading, checkAuth } = useAuthStore()
  const { connect, disconnect } = useSocketStore()

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  useEffect(() => {
    if (user) {
      connect(user)
    } else {
      disconnect()
    }

    return () => {
      disconnect()
    }
  }, [user, connect, disconnect])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-dark-400 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-dark-400 text-white">
      <Routes>
        <Route 
          path="/auth" 
          element={user ? <Navigate to="/channels" replace /> : <AuthPage />} 
        />
        <Route 
          path="/channels/*" 
          element={user ? <DashboardPage /> : <Navigate to="/auth" replace />} 
        />
        <Route 
          path="/" 
          element={<Navigate to={user ? "/channels" : "/auth"} replace />} 
        />
        <Route 
          path="*" 
          element={<Navigate to="/" replace />} 
        />
      </Routes>
    </div>
  )
}

export default App