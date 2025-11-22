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
      
      showSuccess('¡Bienvenido! Iniciando sesión...')
      
      // Forzar actualización de la sesión antes de redirigir
      try {
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        })
        console.log('Sesión establecida correctamente')
      } catch (sessionError) {
        console.warn('Error estableciendo sesión:', sessionError)
        // Continuar de todas formas
      }
      
      // Pequeña pausa para asegurar que todo se establezca
      await new Promise(resolve => setTimeout(resolve, 300))
      
      console.log('Redirigiendo a dashboard según rol...')
      
      // Redirigir según el rol usando window.location para forzar recarga completa
      if (role === 'superadmin') {
        console.log('Redirigiendo a superadmin')
        window.location.href = '/dashboard/superadmin'
      } else if (role === 'vendedor') {
        console.log('Redirigiendo a vendedor')
        window.location.href = '/dashboard/vendedor'
      } else {
        console.log('Redirigiendo a cliente (rol por defecto)')
        window.location.href = '/dashboard/cliente'
      }
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

