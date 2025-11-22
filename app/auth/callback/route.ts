import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const error = requestUrl.searchParams.get('error')
  const mode = requestUrl.searchParams.get('mode')
  const referralCode = requestUrl.searchParams.get('ref') // Código de referido desde la URL

  if (error) {
    console.error('Error en OAuth:', error)
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
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
        
        // Inicializar gamificación
        const initResponse = await fetch(`${baseUrl}/api/gamification/initialize`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id })
        })
        
        // Si hay código de referido, procesarlo después de inicializar
        if (referralCode && initResponse.ok) {
          try {
            await fetch(`${baseUrl}/api/gamification/referral`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                referrerCode: referralCode,
                referredId: user.id
              })
            })
          } catch (referralError) {
            console.error('Error procesando referido en OAuth:', referralError)
          }
        }
      } catch (gamificationError) {
        console.error('Error inicializando gamificación:', gamificationError)
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

