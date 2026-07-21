import { requireAuth } from '@/lib/rbac/guards'
import { AdminSidebar } from '@/components/admin/layout/sidebar'
import { AdminHeader } from '@/components/admin/layout/header'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // 1. Enforce auth at the layout level
  const sessionUser = await requireAuth()

  return (
    <div className="flex h-screen bg-muted/20 overflow-hidden">
      {/* Sidebar */}
      <AdminSidebar role={sessionUser.roleName} />

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <AdminHeader user={sessionUser} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
