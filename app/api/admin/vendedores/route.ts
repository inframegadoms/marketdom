import { NextResponse } from 'next/server'
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user || user.user_metadata?.role !== 'superadmin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Usar cliente admin para obtener vendedores
    const adminClient = createSupabaseAdminClient()

    // Obtener perfiles de vendedores
    const { data: vendedores, error: vendedoresError } = await adminClient
      .from('vendedor_profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (vendedoresError) {
      console.error('Error fetching vendedores:', vendedoresError)
      return NextResponse.json({ error: vendedoresError.message }, { status: 500 })
    }

    // Obtener usuarios de auth para obtener emails
    const { data: { users: authUsers }, error: authError } = await adminClient.auth.admin.listUsers()

    if (authError) {
      console.error('Error fetching auth users:', authError)
      // Continuar sin usuarios de auth si falla
    }

    // Combinar vendedores con emails de usuarios
    const vendedoresWithEmail = (vendedores || []).map((vendedor: any) => {
      const authUser = authUsers?.find((u) => u.id === vendedor.user_id)
      return {
        ...vendedor,
        email: authUser?.email || 'N/A',
      }
    })

    return NextResponse.json({ vendedores: vendedoresWithEmail })
  } catch (error: any) {
    console.error('Error in GET /api/admin/vendedores:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

