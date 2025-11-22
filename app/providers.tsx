'use client'

import { createContext, useContext, useEffect, useState, useMemo } from 'react'
import { createSupabaseClient } from '@/lib/supabase/client'
import { User } from '@/types/database.types'
import { ToastProvider } from '@/contexts/ToastContext'

interface AuthContextType {
  user: User | null
  loading: boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
})

export function Providers({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  
  // Memoizar el cliente para evitar recrearlo en cada render
  const supabase = useMemo(() => createSupabaseClient(), [])

  useEffect(() => {
    let mounted = true
    let timeoutId: NodeJS.Timeout

    const getUser = async () => {
      try {
        // Agregar timeout a getSession para evitar que se quede colgado
        const sessionPromise = supabase.auth.getSession()
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout getting session')), 5000)
        )
        
        let sessionResult
        try {
          sessionResult = await Promise.race([sessionPromise, timeoutPromise])
        } catch (timeoutError) {
          console.warn('Timeout getting session in Providers, setting user to null')
          if (mounted) {
            setUser(null)
            setLoading(false)
          }
          return
        }
        
        const { data: { session }, error: sessionError } = sessionResult as any
        
        if (!mounted) return

        if (sessionError) {
          // No mostrar error si no hay sesión (es normal cuando el usuario no está autenticado)
          if (sessionError.message?.includes('session') || sessionError.message?.includes('Session')) {
            // Sesión faltante es normal cuando no hay usuario autenticado
            if (mounted) {
              setUser(null)
              setLoading(false)
            }
            return
          }
          
          console.error('Error getting session:', sessionError)
          if (mounted) {
            setLoading(false)
          }
          return
        }
        
        const authUser = session?.user
        
        if (authUser) {
          // Fetch user profile and role con timeout también
          const profilePromise = supabase
            .from('user_profiles')
            .select('*')
            .eq('user_id', authUser.id)
            .maybeSingle()
          
          const profileTimeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout fetching profile')), 5000)
          )
          
          let profileResult
          try {
            profileResult = await Promise.race([profilePromise, profileTimeoutPromise])
          } catch (profileTimeoutError) {
            console.warn('Timeout fetching profile, using user without profile')
            profileResult = { data: null, error: null }
          }
          
          const { data: profile, error: profileError } = profileResult as any

          if (profileError && profileError.code !== 'PGRST116') {
            // PGRST116 es "no rows returned", que es normal si el perfil no existe aún
            console.error('Error fetching profile:', profileError)
          }

          if (mounted) {
            setUser({
              id: authUser.id,
              email: authUser.email!,
              role: (authUser.user_metadata?.role as any) || 'cliente',
              created_at: authUser.created_at,
              profile: profile || undefined,
            })
            setLoading(false)
          }
        } else {
          if (mounted) {
            setUser(null)
            setLoading(false)
          }
        }
      } catch (error) {
        console.error('Error in getUser:', error)
        if (mounted) {
          setLoading(false)
        }
      }
    }

    // Timeout de seguridad para evitar loading infinito
    timeoutId = setTimeout(() => {
      if (mounted) {
        console.warn('Timeout loading user, setting loading to false')
        setLoading(false)
      }
    }, 5000)

    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: string, session) => {
        if (!mounted) return
        
        console.log('Auth state changed:', event, session?.user?.email)
        
        // Manejar SIGNED_OUT explícitamente
        if (event === 'SIGNED_OUT') {
          if (mounted) {
            setUser(null)
            setLoading(false)
          }
          return
        }
        
        if (session?.user) {
          // Solo cargar usuario si el evento es SIGNED_IN o TOKEN_REFRESHED
          // No cargar en otros eventos para evitar loops
          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
            await getUser()
          }
        } else {
          // Si no hay sesión pero no es SIGNED_OUT, podría ser un token expirado
          // Intentar refrescar la sesión antes de cerrar (solo para eventos de token)
          if (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') {
            // Estos eventos pueden venir sin sesión inicialmente, intentar obtenerla
            try {
              const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.getSession()
              if (refreshedSession?.user && !refreshError) {
                console.log('Session refreshed successfully after event:', event)
                await getUser()
                return
              }
            } catch (error) {
              console.error('Error refreshing session:', error)
            }
          }
        }
      }
    )

    return () => {
      mounted = false
      clearTimeout(timeoutId)
      subscription?.unsubscribe()
    }
  }, [supabase])

  return (
    <AuthContext.Provider value={{ user, loading }}>
      <ToastProvider>
        {children}
      </ToastProvider>
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)

