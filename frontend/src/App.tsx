import { Routes, Route, Navigate, useParams, useNavigate } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'
import { useSocketStore } from './stores/socketStore'
import AuthPage from './pages/AuthPage'
import DashboardPage from './pages/DashboardPage'
import LoadingSpinner from './components/LoadingSpinner'
import { useEffect } from 'react'
import client from './api/client'
import toast from 'react-hot-toast'

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
          path="/invite/:code"
          element={user ? <InviteHandler /> : <Navigate to="/auth" replace />}
        />
        <Route 
          path="*" 
          element={<Navigate to="/" replace />} 
        />
      </Routes>
    </div>
  )
}

function InviteHandler() {
  const { code } = useParams<{ code: string }>()
  const navigate = useNavigate()

  useEffect(() => {
    if (!code) return
    client.post(`/servers/join/${code}`)
      .then(() => {
        toast.success('Joined server!')
        navigate('/channels', { replace: true })
      })
      .catch((err) => {
        toast.error(err?.response?.data?.message || 'Failed to join server')
        navigate('/channels', { replace: true })
      })
  }, [code, navigate])

  return (
    <div className="min-h-screen bg-dark-400 flex items-center justify-center">
      <LoadingSpinner size="lg" />
    </div>
  )
}

export default App