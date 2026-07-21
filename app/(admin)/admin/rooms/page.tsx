import { requirePermission } from '@/lib/rbac/guards'
import { PERMISSIONS } from '@/lib/rbac/permissions'
import { getRooms, getRoomTypes } from '@/lib/actions/rooms.actions'
import RoomsClient from './rooms-client'

export const dynamic = 'force-dynamic'

export default async function RoomsPage() {
  await requirePermission(PERMISSIONS.ROOMS_READ)
  const [{ data: rooms }, { data: types }] = await Promise.all([
    getRooms(),
    getRoomTypes()
  ])
  return <RoomsClient rooms={rooms ?? []} roomTypes={types ?? []} />
}
