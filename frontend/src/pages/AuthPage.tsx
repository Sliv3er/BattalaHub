import { useState } from 'react'
import { useAuthStore } from '../stores/authStore'
import LoadingSpinner from '../components/LoadingSpinner'

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [formData, setFormData] = useState({
    identifier: '',
    username: '',
    email: '',
    password: '',
    displayName: '',
  })

  const { login, register } = useAuthStore()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setLoginError('')

    try {
      if (isLogin) {
        const success = await login(formData.identifier, formData.password)
        if (!success) {
          setLoginError('Incorrect email or password')
        }
      } else {
        await register(
          formData.username,
          formData.email,
          formData.password,
          formData.displayName || formData.username
        )
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-400 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <img src="/logo.jpeg" alt="Battala Hub" className="w-20 h-20 rounded-2xl mx-auto mb-4" />
          <h1 className="text-4xl font-bold text-white mb-2">
            Battala Hub
          </h1>
          <p className="text-gray-400">
            {isLogin ? 'Welcome back!' : 'Create your account'}
          </p>
        </div>

        {/* Form */}
        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-6">
            {!isLogin && (
              <>
                <div>
                  <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-1">
                    Username
                  </label>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    required
                    className="input"
                    placeholder="Enter your username"
                    value={formData.username}
                    onChange={handleChange}
                  />
                </div>

                <div>
                  <label htmlFor="displayName" className="block text-sm font-medium text-gray-300 mb-1">
                    Display Name (optional)
                  </label>
                  <input
                    id="displayName"
                    name="displayName"
                    type="text"
                    className="input"
                    placeholder="Enter your display name"
                    value={formData.displayName}
                    onChange={handleChange}
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
                    Email
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    className="input"
                    placeholder="Enter your email"
                    value={formData.email}
                    onChange={handleChange}
                  />
                </div>
              </>
            )}

            {isLogin && (
              <div>
                <label htmlFor="identifier" className="block text-sm font-medium text-gray-300 mb-1">
                  Username or Email
                </label>
                <input
                  id="identifier"
                  name="identifier"
                  type="text"
                  required
                  className="input"
                  placeholder="Enter your username or email"
                  value={formData.identifier}
                  onChange={handleChange}
                />
              </div>
            )}

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="input"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
              />
            </div>

            {loginError && isLogin && (
              <p className="text-red-500 text-sm -mt-2">{loginError}</p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full btn-primary flex items-center justify-center"
            >
              {isLoading && <LoadingSpinner size="sm" className="mr-2" />}
              {isLogin ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <div className="mt-6">
            <div className="text-center">
              <span className="text-gray-400">
                {isLogin ? "Don't have an account?" : 'Already have an account?'}
              </span>{' '}
              <button
                type="button"
                onClick={() => { setIsLogin(!isLogin); setLoginError('') }}
                className="text-primary-400 hover:text-primary-300 font-medium"
              >
                {isLogin ? 'Sign up' : 'Sign in'}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-gray-500 text-sm">
          <p>Real-time communication platform</p>
        </div>
      </div>
    </div>
  )
}

export default AuthPage