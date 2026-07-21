'use client'

import { useState, useEffect } from 'react'
import { Users, Plus, Shield, MoreVertical, Ban, Trash2, KeyRound } from 'lucide-react'
import { toast } from 'sonner'
import { getUsers, createUser, updateUserRole, toggleUserSuspension, removeUser } from '@/lib/actions/users.actions'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'

export default function UsersClient({ roles }: { roles: any[] }) {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Form state
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [roleId, setRoleId] = useState('')

  useEffect(() => {
    loadUsers()
  }, [])

  async function loadUsers() {
    setLoading(true)
    const { data, error } = await getUsers()
    if (error) toast.error(error)
    else setUsers(data || [])
    setLoading(false)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !fullName || !roleId) {
      toast.error('Please fill all required fields')
      return
    }
    setSubmitting(true)
    const { error } = await createUser({ email, fullName, roleId })
    if (error) {
      toast.error(error)
    } else {
      toast.success('User created successfully')
      setIsCreateOpen(false)
      setEmail('')
      setFullName('')
      setRoleId('')
      loadUsers()
    }
    setSubmitting(false)
  }

  async function handleToggleSuspension(userId: string, isSuspended: boolean) {
    if (!confirm(isSuspended ? 'Reactivate this user?' : 'Suspend this user? They will not be able to log in.')) return
    const { error } = await toggleUserSuspension(userId, !isSuspended)
    if (error) toast.error(error)
    else {
      toast.success(isSuspended ? 'User reactivated' : 'User suspended')
      loadUsers()
    }
  }

  async function handleRemove(userId: string) {
    if (!confirm('Remove this user from the restaurant? This cannot be undone.')) return
    const { error } = await removeUser(userId)
    if (error) toast.error(error)
    else {
      toast.success('User removed')
      loadUsers()
    }
  }

  async function handleRoleChange(userId: string, newRoleId: string) {
    const { error } = await updateUserRole(userId, newRoleId)
    if (error) toast.error(error)
    else {
      toast.success('Role updated')
      loadUsers()
    }
  }

  const filteredUsers = users.filter(u => 
    u.profiles?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.roles?.display_name?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Users className="h-8 w-8 text-primary" /> User Management
          </h1>
          <p className="text-muted-foreground">Manage staff access, roles, and permissions.</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add User
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Shield className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search users..." 
                value={search} 
                onChange={e => setSearch(e.target.value)} 
                className="pl-9" 
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8">Loading users...</TableCell></TableRow>
                ) : filteredUsers.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No users found.</TableCell></TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="font-medium">{user.profiles?.full_name || 'Unnamed User'}</div>
                        <div className="text-sm text-muted-foreground">{user.email}</div>
                      </TableCell>
                      <TableCell>
                        <Select 
                          defaultValue={user.roles?.id} 
                          onValueChange={(val) => handleRoleChange(user.user_id, val)}
                        >
                          <SelectTrigger className="w-[140px] h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {roles.map(r => (
                              <SelectItem key={r.id} value={r.id}>{r.display_name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        {user.is_suspended ? (
                          <Badge variant="destructive">Suspended</Badge>
                        ) : (
                          <Badge variant="default" className="bg-emerald-500 hover:bg-emerald-600">Active</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString() : 'Never'}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleToggleSuspension(user.user_id, user.is_suspended)}>
                              <Ban className="mr-2 h-4 w-4" /> {user.is_suspended ? 'Reactivate' : 'Suspend'}
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive focus:bg-destructive/10" onClick={() => handleRemove(user.user_id)}>
                              <Trash2 className="mr-2 h-4 w-4" /> Remove User
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleCreate}>
            <DialogHeader>
              <DialogTitle>Add New User</DialogTitle>
              <DialogDescription>
                Create a new staff member and assign them a role. They will receive a temporary password.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Email Address</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="staff@khukuri.local" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  required 
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="name">Full Name</Label>
                <Input 
                  id="name" 
                  placeholder="Ram Bahadur" 
                  value={fullName} 
                  onChange={e => setFullName(e.target.value)} 
                  required 
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="role">Role</Label>
                <Select value={roleId} onValueChange={setRoleId} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map(r => (
                      <SelectItem key={r.id} value={r.id}>{r.display_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Creating...' : 'Create User'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
