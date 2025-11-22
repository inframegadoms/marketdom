import { NextResponse } from 'next/server'
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user || user.user_metadata?.role !== 'superadmin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Usar cliente admin para obtener usuarios
    const adminClient = createSupabaseAdminClient()

    // Obtener perfiles
    const { data: profiles, error: profilesError } = await adminClient
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError)
      return NextResponse.json({ error: profilesError.message }, { status: 500 })
    }

    // Obtener usuarios de auth
    const { data: { users: authUsers }, error: authError } = await adminClient.auth.admin.listUsers()

    if (authError) {
      console.error('Error fetching auth users:', authError)
      // Continuar sin usuarios de auth si falla
    }

    // Combinar perfiles con usuarios de auth
    const usersWithProfiles = (profiles || []).map((profile) => {
      const authUser = authUsers?.find((u) => u.id === profile.user_id)
      return {
        ...profile,
        email: authUser?.email || 'N/A',
        role: authUser?.user_metadata?.role || 'cliente',
      }
    })

    return NextResponse.json({ users: usersWithProfiles })
  } catch (error: any) {
    console.error('Error in GET /api/admin/users:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

