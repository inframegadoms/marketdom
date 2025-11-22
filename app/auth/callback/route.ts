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
    // Verificar si el usuario tiene perfil
    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    // Si es un nuevo usuario o no tiene perfil, crear/actualizar el perfil
    const isNewUser = user.created_at === user.last_sign_in_at
    
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
    if (isNewUser && userRole === 'cliente') {
      try {
        // Importar función del servidor directamente
        const { initializeUserCoinsServer } = await import('@/lib/gamification-server')
        
        console.log(`[OAuth Callback] Inicializando gamificación para usuario: ${user.id}`)
        
        // Inicializar gamificación directamente
        const initialized = await initializeUserCoinsServer(user.id)
        
        if (initialized) {
          console.log(`[OAuth Callback] Gamificación inicializada exitosamente para: ${user.id}`)
          
          // Si hay código de referido, procesarlo después de inicializar
          if (referralCode) {
            console.log(`[OAuth Callback] Procesando código de referido: ${referralCode} para usuario: ${user.id}`)
            
            try {
              // Buscar el referrer_id basado en el código de referido
              const { data: referrerCoins, error: referrerError } = await supabase
                .from('user_coins')
                .select('user_id')
                .eq('referral_code', referralCode)
                .single()
              
              if (referrerError || !referrerCoins) {
                console.error(`[OAuth Callback] Código de referido inválido: ${referralCode}`, referrerError)
              } else {
                // Usar la función del servidor directamente
                const { registerReferralServer } = await import('@/lib/gamification-server')
                
                const registered = await registerReferralServer(
                  referrerCoins.user_id,
                  user.id,
                  referralCode
                )
                
                if (registered) {
                  console.log(`[OAuth Callback] Referido registrado exitosamente. Referrer: ${referrerCoins.user_id}, Referred: ${user.id}`)
                } else {
                  console.error(`[OAuth Callback] No se pudo registrar el referido`)
                }
              }
            } catch (referralError: any) {
              console.error('[OAuth Callback] Error procesando referido:', referralError.message || referralError)
            }
          }
        } else {
          console.error(`[OAuth Callback] No se pudo inicializar gamificación para: ${user.id}`)
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

