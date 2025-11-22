import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export const createSupabaseServerClient = () => {
  return createServerComponentClient({ cookies })
}

export const createSupabaseAdminClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl) {
    console.error('[createSupabaseAdminClient] Error: NEXT_PUBLIC_SUPABASE_URL no está configurada')
    throw new Error('NEXT_PUBLIC_SUPABASE_URL no está configurada')
  }

  if (!supabaseServiceKey) {
    console.error('[createSupabaseAdminClient] Error: SUPABASE_SERVICE_ROLE_KEY no está configurada')
    console.error('[createSupabaseAdminClient] Esta variable es necesaria para operaciones admin que bypass RLS')
    throw new Error('SUPABASE_SERVICE_ROLE_KEY no está configurada. Por favor, configúrala en las variables de entorno de Vercel.')
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

