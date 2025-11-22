import { NextResponse } from 'next/server'
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user || user.user_metadata?.role !== 'superadmin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Usar cliente admin para obtener user_coins (bypassa RLS)
    const adminClient = createSupabaseAdminClient()

    console.log('Fetching user_coins with admin client...')
    
    // Obtener user_coins
    const { data: userCoins, error: userCoinsError } = await adminClient
      .from('user_coins')
      .select('*')
      .order('created_at', { ascending: false })

    if (userCoinsError) {
      console.error('Error fetching user_coins:', userCoinsError)
      return NextResponse.json({ 
        error: userCoinsError.message,
        details: userCoinsError.details,
        hint: userCoinsError.hint,
        code: userCoinsError.code
      }, { status: 500 })
    }

    console.log(`Successfully fetched ${userCoins?.length || 0} user_coins records`)
    
    return NextResponse.json({ userCoins: userCoins || [] })
  } catch (error: any) {
    console.error('Error in GET /api/admin/user-coins:', error)
    return NextResponse.json({ 
      error: error.message || 'Internal server error',
      stack: error.stack
    }, { status: 500 })
  }
}

