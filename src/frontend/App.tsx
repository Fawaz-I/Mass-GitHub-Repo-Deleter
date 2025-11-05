import { useEffect, useState } from 'react'
import LoginPage from './components/LoginPage'
import Dashboard from './components/Dashboard'

function App() {
  const [jwt, setJwt] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check for JWT in URL params
    const params = new URLSearchParams(window.location.search)
    const authToken = params.get('auth')

    if (authToken) {
      setJwt(authToken)
      // Clean URL
      window.history.replaceState({}, '', '/')
    }

    setLoading(false)
  }, [])

  const handleLogout = () => {
    setJwt(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    )
  }

  return jwt ? <Dashboard jwt={jwt} onLogout={handleLogout} /> : <LoginPage />
}

export default App