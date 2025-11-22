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
          // Establecer usuario inmediatamente con datos básicos
          if (mounted) {
            setUser({
              id: authUser.id,
              email: authUser.email!,
              role: (authUser.user_metadata?.role as any) || 'cliente',
              created_at: authUser.created_at,
              profile: undefined, // Se cargará después si es necesario
            })
            setLoading(false)
          }
          
          // Cargar perfil en segundo plano (no bloquea)
          ;(async () => {
            try {
              const { data: profile, error: profileError } = await supabase
                .from('user_profiles')
                .select('*')
                .eq('user_id', authUser.id)
                .maybeSingle()
              
              if (!mounted) return
              
              if (profileError && profileError.code !== 'PGRST116') {
                console.error('Error fetching profile:', profileError)
              }
              
              // Actualizar usuario con perfil si existe
              if (profile) {
                setUser(prev => prev ? {
                  ...prev,
                  profile: profile
                } : null)
              }
            } catch (error) {
              console.error('Error loading profile in background:', error)
            }
          })()
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

    // Timeout de seguridad más corto para evitar que se quede colgado
    timeoutId = setTimeout(() => {
      if (mounted && loading) {
        console.warn('Timeout loading user, verificando sesión...')
        // Verificar si hay sesión antes de dejar de mostrar loading
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (mounted && loading) { // Solo si sigue en loading
            if (session?.user) {
              // Hay sesión, establecer usuario básico
              setUser({
                id: session.user.id,
                email: session.user.email!,
                role: (session.user.user_metadata?.role as any) || 'cliente',
                created_at: session.user.created_at,
                profile: undefined,
              })
            }
            setLoading(false) // Asegurar que loading se establezca en false
          }
        }).catch(() => {
          // Si falla la verificación, establecer loading en false de todos modos
          if (mounted && loading) {
            setLoading(false)
          }
        })
      }
    }, 5000) // Reducido a 5 segundos para respuesta más rápida

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
            // Establecer usuario inmediatamente con datos básicos de la sesión
            setUser({
              id: session.user.id,
              email: session.user.email!,
              role: (session.user.user_metadata?.role as any) || 'cliente',
              created_at: session.user.created_at,
              profile: undefined, // Se cargará después
            })
            setLoading(false) // Establecer loading en false inmediatamente
            
            // Cargar perfil completo en segundo plano
            ;(async () => {
              try {
                const { data: profile } = await supabase
                  .from('user_profiles')
                  .select('*')
                  .eq('user_id', session.user.id)
                  .maybeSingle()
                
                if (mounted && profile) {
                  setUser(prev => prev ? {
                    ...prev,
                    profile: profile
                  } : null)
                }
              } catch (error) {
                console.error('Error loading profile after SIGNED_IN:', error)
              }
            })()
          }
          return
        }
        
        // Para TOKEN_REFRESHED, solo actualizar si no hay usuario o si el usuario cambió
        if (event === 'TOKEN_REFRESHED' && session?.user) {
          if (mounted && (!user || user.id !== session.user.id)) {
            // No cambiar loading, solo actualizar usuario si es necesario
            if (!user) {
              setUser({
                id: session.user.id,
                email: session.user.email!,
                role: (session.user.user_metadata?.role as any) || 'cliente',
                created_at: session.user.created_at,
                profile: undefined,
              })
              setLoading(false)
            }
            // Cargar perfil en segundo plano si no existe
            if (!user?.profile) {
              ;(async () => {
                try {
                  const { data: profile } = await supabase
                    .from('user_profiles')
                    .select('*')
                    .eq('user_id', session.user.id)
                    .maybeSingle()
                  
                  if (mounted && profile) {
                    setUser(prev => prev ? { ...prev, profile } : null)
                  }
                } catch (error) {
                  console.error('Error loading profile after TOKEN_REFRESHED:', error)
                }
              })()
            }
          }
          return
        }
        
        // Para USER_UPDATED, actualizar datos del usuario sin cambiar loading
        if (event === 'USER_UPDATED' && session?.user) {
          if (mounted) {
            setUser(prev => prev ? {
              ...prev,
              email: session.user.email!,
              role: (session.user.user_metadata?.role as any) || prev.role,
            } : null)
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

