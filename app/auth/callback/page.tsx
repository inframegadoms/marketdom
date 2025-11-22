'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createSupabaseClient } from '@/lib/supabase/client'
import Card from '@/components/ui/Card'

export default function AuthCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createSupabaseClient()

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Obtener el código de la URL
        const code = searchParams.get('code')
        const mode = searchParams.get('mode') // 'register' o null (login)

        if (!code) {
          setError('No se recibió código de autorización')
          setLoading(false)
          setTimeout(() => router.push('/auth/login'), 3000)
          return
        }

        // Intercambiar el código por una sesión
        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

        if (exchangeError) {
          console.error('Error intercambiando código:', exchangeError)
          setError('Error al completar la autenticación. Por favor, intenta nuevamente.')
          setLoading(false)
          setTimeout(() => router.push('/auth/login'), 3000)
          return
        }

        if (!data.user) {
          setError('No se pudo obtener información del usuario')
          setLoading(false)
          setTimeout(() => router.push('/auth/login'), 3000)
          return
        }

        // Verificar si el usuario tiene perfil
        const { data: existingProfile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', data.user.id)
          .maybeSingle()

        // Si es un nuevo usuario o no tiene perfil, crear/actualizar el perfil
        const isNewUser = data.user.created_at === data.user.last_sign_in_at
        
        if (isNewUser || !existingProfile || mode === 'register') {
          // Obtener nombre del usuario de Google
          const fullName = data.user.user_metadata?.full_name || 
                          data.user.user_metadata?.name ||
                          data.user.email?.split('@')[0] || 
                          'Usuario'

          // Crear o actualizar perfil de usuario
          const { error: profileError } = await supabase
            .from('user_profiles')
            .upsert({
              user_id: data.user.id,
              full_name: fullName,
            }, {
              onConflict: 'user_id'
            })

          if (profileError) {
            console.warn('Error creando/actualizando perfil:', profileError)
          }
        }

        // Si el usuario no tiene rol, asignar 'cliente' por defecto
        if (!data.user.user_metadata?.role) {
          await supabase.auth.updateUser({
            data: {
              role: 'cliente',
            }
          })
        }

        // Si es un nuevo usuario cliente, inicializar gamificación
        const userRole = data.user.user_metadata?.role || 'cliente'
        if (isNewUser && userRole === 'cliente') {
          try {
            const baseUrl = window.location.origin
            await fetch(`${baseUrl}/api/gamification/initialize`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId: data.user.id })
            })
          } catch (gamificationError) {
            console.error('Error inicializando gamificación:', gamificationError)
          }
        }

        // Si es vendedor y no tiene perfil de vendedor, crearlo
        if (userRole === 'vendedor') {
          const { data: existingVendedor } = await supabase
            .from('vendedor_profiles')
            .select('id')
            .eq('user_id', data.user.id)
            .maybeSingle()

          if (!existingVendedor) {
            const fullName = data.user.user_metadata?.full_name || 
                            data.user.user_metadata?.name ||
                            data.user.email?.split('@')[0] || 
                            'Usuario'
            
            await supabase
              .from('vendedor_profiles')
              .insert({
                user_id: data.user.id,
                store_name: `${fullName}'s Store`,
                plan: 'gratuito',
              })
          }
        }

        // Redirigir según el rol
        const role = data.user.user_metadata?.role || 'cliente'
        
        if (role === 'superadmin') {
          router.push('/dashboard/superadmin')
        } else if (role === 'vendedor') {
          router.push('/dashboard/vendedor')
        } else {
          router.push('/dashboard/cliente')
        }
      } catch (err: any) {
        console.error('Error en callback:', err)
        setError('Error al procesar la autenticación')
        setLoading(false)
        setTimeout(() => router.push('/auth/login'), 3000)
      }
    }

    handleAuthCallback()
  }, [router, searchParams, supabase])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-primary-900 to-gray-900 p-4">
      <Card className="glass backdrop-blur-xl border-white/20 max-w-md w-full">
        <div className="text-center py-8">
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Completando autenticación...
              </h2>
              <p className="text-gray-600">
                Por favor, espera mientras configuramos tu cuenta
              </p>
            </>
          ) : error ? (
            <>
              <div className="text-red-500 text-4xl mb-4">⚠️</div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Error de autenticación
              </h2>
              <p className="text-gray-600 mb-4">{error}</p>
              <p className="text-sm text-gray-500">
                Redirigiendo al login...
              </p>
            </>
          ) : null}
        </div>
      </Card>
    </div>
  )
}

