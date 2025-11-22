import { redirect } from 'next/navigation'
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase/server'
import DashboardLayout from '@/components/DashboardLayout'
import Card from '@/components/ui/Card'

export default async function SuperAdminDashboard() {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.user_metadata?.role !== 'superadmin') {
    redirect('/')
  }

  const adminClient = createSupabaseAdminClient()
  
  const [usersResult, vendedoresResult, productsResult, ordersResult] = await Promise.all([
    adminClient.from('user_profiles').select('id', { count: 'exact', head: true }),
    adminClient.from('vendedor_profiles').select('id', { count: 'exact', head: true }),
    adminClient.from('products').select('id', { count: 'exact', head: true }),
    adminClient.from('orders').select('id', { count: 'exact', head: true }),
  ])

  const stats = {
    users: usersResult.count || 0,
    vendedores: vendedoresResult.count || 0,
    products: productsResult.count || 0,
    orders: ordersResult.count || 0,
  }

  const navItems = [
    { href: '/dashboard/superadmin', label: 'Dashboard' },
    { href: '/dashboard/superadmin/users', label: 'Usuarios' },
    { href: '/dashboard/superadmin/vendedores', label: 'Vendedores' },
    { href: '/dashboard/superadmin/products', label: 'Productos' },
    { href: '/dashboard/superadmin/orders', label: 'Órdenes' },
    { href: '/dashboard/superadmin/gamification', label: 'Gamificación' },
  ]

  const statCards = [
    {
      title: 'Total Usuarios',
      value: stats.users,
      icon: (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-600',
    },
    {
      title: 'Vendedores',
      value: stats.vendedores,
      icon: (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
      ),
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-100',
      textColor: 'text-purple-600',
    },
    {
      title: 'Productos',
      value: stats.products,
      icon: (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
      color: 'from-primary-500 to-primary-600',
      bgColor: 'bg-primary-100',
      textColor: 'text-primary-600',
    },
    {
      title: 'Órdenes',
      value: stats.orders,
      icon: (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-100',
      textColor: 'text-green-600',
    },
  ]

  return (
    <DashboardLayout role="superadmin" title="Dashboard SuperAdmin" navItems={navItems}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <Card
            key={stat.title}
            hover
            glow
            className="relative overflow-hidden animate-fade-in"
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${stat.color} rounded-full -mr-16 -mt-16 opacity-10`} />
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-14 h-14 ${stat.bgColor} rounded-xl flex items-center justify-center ${stat.textColor}`}>
                  {stat.icon}
                </div>
              </div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">{stat.title}</h3>
              <p className="text-4xl font-bold text-gray-900">{stat.value.toLocaleString()}</p>
            </div>
          </Card>
        ))}
      </div>
    </DashboardLayout>
  )
}
