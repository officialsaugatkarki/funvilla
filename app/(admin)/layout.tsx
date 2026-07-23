import { requireAuth } from '@/lib/rbac/guards'
import { AdminSidebar, MobileSidebar } from '@/components/admin/layout/sidebar'
import { AdminHeader } from '@/components/admin/layout/header'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const sessionUser = await requireAuth()

  return (
    <div className="flex h-screen bg-muted/20 overflow-hidden">
      {/* Desktop Sidebar */}
      <AdminSidebar role={sessionUser.roleName} />

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        <AdminHeader user={sessionUser} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>

      {/* Mobile Sidebar Overlay — client component with open/close state */}
      <MobileSidebar role={sessionUser.roleName} />
    </div>
  )
}
