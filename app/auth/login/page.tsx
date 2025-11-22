'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseClient } from '@/lib/supabase/client'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Card from '@/components/ui/Card'
import { useToast } from '@/contexts/ToastContext'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = useMemo(() => createSupabaseClient(), [])
  const { showSuccess, showError } = useToast()

  const handleGoogleLogin = async () => {
    try {
      setError('')
      setLoading(true)
      
      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      })

      if (oauthError) {
        console.error('Error en OAuth:', oauthError)
        setError('Error al iniciar sesión con Google. Por favor, intenta nuevamente.')
        showError('Error al iniciar sesión con Google')
        setLoading(false)
        return
      }

      // La redirección se manejará automáticamente
    } catch (err: any) {
      console.error('Error en handleGoogleLogin:', err)
      setError('Error al iniciar sesión con Google')
      showError('Error al iniciar sesión con Google')
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Validar que los campos no estén vacíos
      if (!email || !password) {
        setLoading(false)
        throw new Error('Por favor, completa todos los campos')
      }

      // Validar formato de email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        setLoading(false)
        throw new Error('Por favor, ingresa un email válido')
      }

      console.log('Intentando iniciar sesión con:', email)
      console.log('Cliente Supabase inicializado:', !!supabase)
      
      // Verificar que las variables de entorno estén configuradas
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
        console.error('NEXT_PUBLIC_SUPABASE_URL no está configurado')
        throw new Error('Error de configuración: Variables de entorno faltantes')
      }
      
      console.log('Iniciando signInWithPassword...')
      const startTime = Date.now()
      
      // Agregar timeout a la llamada de autenticación
      const loginPromise = supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      })
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout: La autenticación está tardando demasiado. Por favor, intenta nuevamente.')), 10000)
      )
      
      let loginResult
      try {
        loginResult = await Promise.race([loginPromise, timeoutPromise])
        const elapsedTime = Date.now() - startTime
        console.log(`Login completado en ${elapsedTime}ms`)
      } catch (timeoutError: any) {
        const elapsedTime = Date.now() - startTime
        console.error(`Timeout en login después de ${elapsedTime}ms:`, timeoutError)
        setLoading(false)
        const errorMsg = timeoutError.message || 'La autenticación está tardando demasiado. Por favor, verifica tu conexión e intenta nuevamente.'
        setError(errorMsg)
        showError(errorMsg)
        return
      }
      
      const { data, error: authError } = loginResult as any
      
      console.log('Resultado del login recibido:', {
        hasData: !!data,
        hasUser: !!data?.user,
        hasSession: !!data?.session,
        hasError: !!authError
      })

      if (authError) {
        console.error('Error de autenticación:', authError)
        console.error('Status:', authError.status)
        console.error('Message:', authError.message)
        
        // Mensajes de error más específicos
        let errorMessage = 'Error al iniciar sesión'
        
        if (authError.status === 400) {
          if (authError.message?.includes('Invalid login credentials') || 
              authError.message?.includes('invalid_credentials') ||
              authError.message?.includes('Invalid password') ||
              authError.message?.toLowerCase().includes('invalid')) {
            errorMessage = 'Email o contraseña incorrectos. Por favor, verifica tus credenciales.'
          } else if (authError.message?.includes('Email not confirmed')) {
            errorMessage = 'Por favor, confirma tu email antes de iniciar sesión. Revisa tu bandeja de entrada.'
          } else {
            errorMessage = `Error de autenticación: ${authError.message || 'Credenciales inválidas'}`
          }
        } else if (authError.status === 429) {
          errorMessage = 'Demasiados intentos de inicio de sesión. Por favor, espera 5-10 minutos antes de intentar nuevamente. Esto es una medida de seguridad de Supabase.'
        } else {
          errorMessage = authError.message || 'Error al iniciar sesión'
        }
        
        setLoading(false)
        setError(errorMessage)
        showError(errorMessage)
        return
      }

      if (!data || !data.user || !data.session) {
        setLoading(false)
        const errorMsg = 'No se pudo establecer la sesión. Por favor, intenta nuevamente.'
        setError(errorMsg)
        showError(errorMsg)
        return
      }

      console.log('Login exitoso, usuario:', data.user.id)
      console.log('User metadata:', data.user.user_metadata)
      console.log('Session:', data.session ? 'Existe' : 'No existe')
      
      const role = data.user.user_metadata?.role || 'cliente'
      console.log('Rol del usuario detectado:', role)
      
      showSuccess('¡Bienvenido! Redirigiendo...')
      
      // No necesitamos setSession, signInWithPassword ya establece la sesión
      // Solo esperar un momento para que el evento SIGNED_IN se propague
      await new Promise(resolve => setTimeout(resolve, 500))
      
      console.log('Redirigiendo a dashboard según rol...')
      
      // Redirigir según el rol usando router.push para mejor experiencia
      if (role === 'superadmin') {
        console.log('Redirigiendo a superadmin')
        router.push('/dashboard/superadmin')
      } else if (role === 'vendedor') {
        console.log('Redirigiendo a vendedor')
        router.push('/dashboard/vendedor')
      } else {
        console.log('Redirigiendo a cliente (rol por defecto)')
        router.push('/dashboard/cliente')
      }
      
      // Marcar loading como false después de redirigir
      setLoading(false)
    } catch (err: any) {
      console.error('Error completo en login:', err)
      const errorMessage = err.message || 'Error al iniciar sesión. Por favor, intenta nuevamente.'
      setError(errorMessage)
      showError(errorMessage)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-primary-900 to-gray-900 p-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse-slow" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse-slow" style={{ animationDelay: '2s' }} />
      </div>

      <div className="relative z-10 w-full max-w-md animate-scale-in">
        <Card className="glass backdrop-blur-xl border-white/20">
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center space-x-2 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-primary-400 to-primary-600 rounded-xl flex items-center justify-center shadow-glow">
                <span className="text-white font-bold text-2xl">M</span>
              </div>
            </Link>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
              Bienvenido de vuelta
            </h2>
            <p className="text-gray-300">Inicia sesión en tu cuenta</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg backdrop-blur-sm animate-slide-down">
                {error}
              </div>
            )}

            <Input
              label="Email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-white/10 border-white/20 text-gray-900 placeholder:text-gray-500 focus:bg-white/20"
              placeholder="tu@email.com"
            />

            <Input
              label="Contraseña"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-white/10 border-white/20 text-gray-900 placeholder:text-gray-500 focus:bg-white/20"
              placeholder="••••••••"
            />

            <Button
              type="submit"
              disabled={loading}
              loading={loading}
              size="lg"
              className="w-full shadow-glow hover:shadow-glow-lg"
            >
              Iniciar Sesión
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/20"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-transparent text-gray-300">O</span>
              </div>
            </div>

            <Button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              size="lg"
              className="w-full bg-white hover:bg-gray-50 text-gray-900 border-2 border-gray-300 shadow-md hover:shadow-lg flex items-center justify-center"
            >
              <svg className="w-5 h-5 mr-2 flex-shrink-0" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continuar con Google
            </Button>

            <div className="text-center space-y-2">
              <Link
                href="/auth/register"
                className="text-primary-300 hover:text-primary-200 transition-colors text-sm font-medium block"
              >
                ¿No tienes cuenta?{' '}
                <span className="underline">Regístrate aquí</span>
              </Link>
              <button
                type="button"
                onClick={() => {
                  const emailToRecover = prompt('Ingresa tu email para recuperar tu contraseña:')
                  if (emailToRecover) {
                    supabase.auth.resetPasswordForEmail(emailToRecover, {
                      redirectTo: `${window.location.origin}/auth/reset-password`,
                    }).then(({ error }) => {
                      if (error) {
                        showError('Error al enviar el email de recuperación: ' + error.message)
                      } else {
                        showSuccess('Se ha enviado un email con instrucciones para recuperar tu contraseña.')
                      }
                    })
                  }
                }}
                className="text-primary-300 hover:text-primary-200 transition-colors text-sm font-medium underline"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  )
}

