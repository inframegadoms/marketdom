import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const error = requestUrl.searchParams.get('error')
  const mode = requestUrl.searchParams.get('mode')
  const referralCode = requestUrl.searchParams.get('ref') // Código de referido desde la URL

  console.log(`[OAuth Callback] Iniciando callback. Mode: ${mode}, ReferralCode: ${referralCode || 'ninguno'}`)

  if (error) {
    console.error('[OAuth Callback] Error en OAuth:', error)
    return NextResponse.redirect(
      new URL(`/auth/login?error=${encodeURIComponent(error)}`, requestUrl.origin)
    )
  }

  if (code) {
    const supabase = createRouteHandlerClient({ cookies })
    
    try {
      // Intercambiar el código por una sesión (Supabase maneja automáticamente el code_verifier)
      const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

      if (exchangeError) {
        console.error('Error intercambiando código:', exchangeError)
        return NextResponse.redirect(
          new URL('/auth/login?error=exchange_failed', requestUrl.origin)
        )
      }

      if (!data.user) {
        return NextResponse.redirect(
          new URL('/auth/login?error=no_user', requestUrl.origin)
        )
      }

      // Procesar el usuario (crear perfil, etc.)
      console.log(`[OAuth Callback] Procesando usuario: ${data.user.email}, ID: ${data.user.id}`)
      await processUser(supabase, data.user, mode, referralCode)

      // Redirigir según el rol
      const role = data.user.user_metadata?.role || 'cliente'
      let redirectPath = '/dashboard/cliente'
      
      if (role === 'superadmin') {
        redirectPath = '/dashboard/superadmin'
      } else if (role === 'vendedor') {
        redirectPath = '/dashboard/vendedor'
      }

      return NextResponse.redirect(new URL(redirectPath, requestUrl.origin))
    } catch (err: any) {
      console.error('Error en callback route:', err)
      return NextResponse.redirect(
        new URL('/auth/login?error=callback_error', requestUrl.origin)
      )
    }
  }

  // Si no hay código, redirigir al login
  return NextResponse.redirect(new URL('/auth/login', requestUrl.origin))
}

async function processUser(supabase: any, user: any, mode: string | null, referralCode: string | null) {
  try {
    console.log(`[processUser] Iniciando procesamiento. User ID: ${user.id}, Email: ${user.email}`)
    console.log(`[processUser] Mode: ${mode}, ReferralCode: ${referralCode || 'ninguno'}`)
    console.log(`[processUser] created_at: ${user.created_at}, last_sign_in_at: ${user.last_sign_in_at}`)
    
    // Verificar si el usuario tiene perfil
    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    // Si es un nuevo usuario o no tiene perfil, crear/actualizar el perfil
    const isNewUser = user.created_at === user.last_sign_in_at
    console.log(`[processUser] isNewUser: ${isNewUser}, existingProfile: ${existingProfile ? 'existe' : 'no existe'}`)
    
    if (isNewUser || !existingProfile || mode === 'register') {
      // Obtener nombre del usuario de Google
      const fullName = user.user_metadata?.full_name || 
                      user.user_metadata?.name ||
                      user.email?.split('@')[0] || 
                      'Usuario'

      // Crear o actualizar perfil de usuario
      await supabase
        .from('user_profiles')
        .upsert({
          user_id: user.id,
          full_name: fullName,
        }, {
          onConflict: 'user_id'
        })
    }

    // Si el usuario no tiene rol, asignar 'cliente' por defecto
    if (!user.user_metadata?.role) {
      await supabase.auth.updateUser({
        data: {
          role: 'cliente',
        }
      })
    }

    // Si es un nuevo usuario cliente, inicializar gamificación
    const userRole = user.user_metadata?.role || 'cliente'
    console.log(`[processUser] userRole: ${userRole}`)
    console.log(`[processUser] Condición para inicializar: isNewUser=${isNewUser} && userRole=${userRole} === 'cliente'`)
    
    if (isNewUser && userRole === 'cliente') {
      console.log(`[processUser] ✅ Condición cumplida, inicializando gamificación...`)
      try {
        // Importar función del servidor directamente
        const { initializeUserCoinsServer } = await import('@/lib/gamification-server')
        
        console.log(`[processUser] ✅ Función importada, llamando initializeUserCoinsServer(${user.id})`)
        
        // Inicializar gamificación directamente
        const initialized = await initializeUserCoinsServer(user.id)
        console.log(`[processUser] initializeUserCoinsServer retornó: ${initialized}`)
        
        if (initialized) {
          console.log(`[OAuth Callback] ✅ Gamificación inicializada exitosamente para: ${user.id}`)
          
          // Esperar un momento para asegurar que el registro se haya guardado
          await new Promise(resolve => setTimeout(resolve, 500))
          
          // Si hay código de referido, procesarlo después de inicializar
          if (referralCode) {
            console.log(`[OAuth Callback] 🔗 Procesando código de referido: ${referralCode} para usuario: ${user.id}`)
            
            try {
              // Usar cliente admin para buscar el referrer
              const { createSupabaseAdminClient } = await import('@/lib/supabase/server')
              const adminSupabase = createSupabaseAdminClient()
              
              // Buscar el referrer_id basado en el código de referido
              const { data: referrerCoins, error: referrerError } = await adminSupabase
                .from('user_coins')
                .select('user_id')
                .eq('referral_code', referralCode)
                .maybeSingle()
              
              if (referrerError) {
                console.error(`[OAuth Callback] ❌ Error buscando referrer:`, referrerError)
              } else if (!referrerCoins) {
                console.error(`[OAuth Callback] ❌ Código de referido inválido o no encontrado: ${referralCode}`)
              } else {
                console.log(`[OAuth Callback] ✅ Referrer encontrado: ${referrerCoins.user_id}`)
                
                // Usar la función del servidor directamente
                const { registerReferralServer } = await import('@/lib/gamification-server')
                
                console.log(`[OAuth Callback] 📝 Registrando referido...`)
                const registered = await registerReferralServer(
                  referrerCoins.user_id,
                  user.id,
                  referralCode
                )
                
                if (registered) {
                  console.log(`[OAuth Callback] ✅ Referido registrado exitosamente. Referrer: ${referrerCoins.user_id}, Referred: ${user.id}`)
                } else {
                  console.error(`[OAuth Callback] ❌ No se pudo registrar el referido (registerReferralServer retornó false)`)
                }
              }
            } catch (referralError: any) {
              console.error('[OAuth Callback] ❌ Error procesando referido:', referralError.message || referralError)
              console.error('[OAuth Callback] Stack:', referralError.stack)
            }
          } else {
            console.log(`[OAuth Callback] ℹ️ No hay código de referido para procesar`)
          }
        } else {
          console.error(`[OAuth Callback] ❌ No se pudo inicializar gamificación para: ${user.id}`)
        }
      } catch (gamificationError: any) {
        console.error('[OAuth Callback] Error inicializando gamificación:', gamificationError.message || gamificationError)
      }
    }

    // Si es vendedor y no tiene perfil de vendedor, crearlo
    if (userRole === 'vendedor') {
      const { data: existingVendedor } = await supabase
        .from('vendedor_profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (!existingVendedor) {
        const fullName = user.user_metadata?.full_name || 
                        user.user_metadata?.name ||
                        user.email?.split('@')[0] || 
                        'Usuario'
        
        await supabase
          .from('vendedor_profiles')
          .insert({
            user_id: user.id,
            store_name: `${fullName}'s Store`,
            plan: 'gratuito',
          })
      }
    }
  } catch (err: any) {
    console.error('Error procesando usuario:', err)
    // No lanzar el error para no interrumpir el flujo de autenticación
  }
}

