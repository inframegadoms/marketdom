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
        // Intentar obtener sesión sin timeout agresivo
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
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
            setUser(null)
            setLoading(false)
          }
          return
        }
        
        const authUser = session?.user
        
        if (authUser) {
          // Fetch user profile sin timeout agresivo
          const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('user_id', authUser.id)
            .maybeSingle()

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
          setUser(null)
          setLoading(false)
        }
      }
    }

    // Timeout de seguridad más largo para evitar cerrar sesión prematuramente
    timeoutId = setTimeout(() => {
      if (mounted && loading) {
        console.warn('Timeout loading user, pero manteniendo sesión si existe')
        // No establecer user a null, solo dejar de mostrar loading
        setLoading(false)
      }
    }, 10000) // Aumentado a 10 segundos

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
        
        // Para SIGNED_IN, actualizar inmediatamente
        if (event === 'SIGNED_IN' && session?.user) {
          if (mounted) {
            setLoading(true)
            await getUser()
          }
          return
        }
        
        // Para TOKEN_REFRESHED, solo actualizar si no hay usuario o si el usuario cambió
        if (event === 'TOKEN_REFRESHED' && session?.user) {
          if (mounted && (!user || user.id !== session.user.id)) {
            await getUser()
          }
          return
        }
        
        // Para USER_UPDATED, actualizar datos del usuario
        if (event === 'USER_UPDATED' && session?.user) {
          if (mounted) {
            await getUser()
          }
          return
        }
        
        // Para INITIAL_SESSION, solo cargar si no hay usuario aún
        if (event === 'INITIAL_SESSION') {
          if (mounted && !user) {
            await getUser()
          }
          return
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

