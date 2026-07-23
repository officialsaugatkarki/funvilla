'use client'

import { useState, useEffect } from 'react'
import { Users, Plus, Shield, MoreVertical, Ban, Trash2, KeyRound, Eye, EyeOff, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import {
  getUsers,
  createUser,
  updateUserRole,
  toggleUserSuspension,
  removeUser,
  resetUserPassword,
} from '@/lib/actions/users.actions'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'

const ROLE_COLORS: Record<string, string> = {
  owner: 'bg-purple-100 text-purple-800 border-purple-200',
  admin: 'bg-red-100 text-red-800 border-red-200',
  manager: 'bg-orange-100 text-orange-800 border-orange-200',
  reception: 'bg-blue-100 text-blue-800 border-blue-200',
  cashier: 'bg-green-100 text-green-800 border-green-200',
  kitchen: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  waiter: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  housekeeping: 'bg-pink-100 text-pink-800 border-pink-200',
  inventory_manager: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  viewer: 'bg-gray-100 text-gray-800 border-gray-200',
}

export default function UsersClient({ roles }: { roles: any[] }) {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Create dialog
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [createForm, setCreateForm] = useState({
    email: '',
    fullName: '',
    phone: '',
    password: '',
    roleId: '',
  })

  // Reset password dialog
  const [resetTarget, setResetTarget] = useState<{ userId: string; name: string } | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [resetting, setResetting] = useState(false)

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
    if (!createForm.email || !createForm.fullName || !createForm.roleId) {
      toast.error('Email, full name and role are required')
      return
    }
    if (createForm.password && createForm.password.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    setSubmitting(true)
    const { error } = await createUser({
      email: createForm.email,
      fullName: createForm.fullName,
      phone: createForm.phone || undefined,
      roleId: createForm.roleId,
      password: createForm.password || undefined,
    })
    if (error) {
      toast.error(error)
    } else {
      toast.success('User created successfully')
      setIsCreateOpen(false)
      setCreateForm({ email: '', fullName: '', phone: '', password: '', roleId: '' })
      loadUsers()
    }
    setSubmitting(false)
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault()
    if (!resetTarget || !newPassword || newPassword.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    setResetting(true)
    const { error } = await resetUserPassword(resetTarget.userId, newPassword)
    if (error) {
      toast.error(error)
    } else {
      toast.success(`Password reset for ${resetTarget.name}`)
      setResetTarget(null)
      setNewPassword('')
    }
    setResetting(false)
  }

  async function handleToggleSuspension(userId: string, isSuspended: boolean) {
    if (!confirm(isSuspended ? 'Reactivate this user?' : 'Suspend this user? They cannot log in until reactivated.')) return
    const { error } = await toggleUserSuspension(userId, !isSuspended)
    if (error) toast.error(error)
    else {
      toast.success(isSuspended ? 'User reactivated' : 'User suspended')
      loadUsers()
    }
  }

  async function handleRemove(userId: string, name: string) {
    if (!confirm(`Remove "${name}" from this restaurant? This cannot be undone.`)) return
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

  const filteredUsers = users.filter(
    (u) =>
      u.profiles?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.roles?.display_name?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" /> User Management
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">Manage staff access, roles, and passwords.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadUsers} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add User
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3 pt-4 px-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Shield className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email or role..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            <Badge variant="secondary">{filteredUsers.length} users</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="rounded-b-lg border-t overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead className="w-[60px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                      Loading users...
                    </TableCell>
                  </TableRow>
                ) : filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                      No users found. Add one using the button above.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => {
                    const roleName = user.roles?.name || ''
                    const roleColor = ROLE_COLORS[roleName] || 'bg-gray-100 text-gray-800'
                    return (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="font-medium">{user.profiles?.full_name || 'Unnamed'}</div>
                          <div className="text-xs text-muted-foreground">{user.email}</div>
                          {user.profiles?.phone && (
                            <div className="text-xs text-muted-foreground">{user.profiles.phone}</div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Select
                            defaultValue={user.roles?.id}
                            onValueChange={(val) => handleRoleChange(user.user_id, val)}
                          >
                            <SelectTrigger className="w-[150px] h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {roles.map((r) => (
                                <SelectItem key={r.id} value={r.id} className="text-xs">
                                  {r.display_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-medium border ${roleColor}`}>
                            {user.roles?.display_name || 'No Role'}
                          </span>
                        </TableCell>
                        <TableCell>
                          {user.is_suspended ? (
                            <Badge variant="destructive">Suspended</Badge>
                          ) : (
                            <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white">Active</Badge>
                          )}
                          {!user.email_confirmed_at && (
                            <div className="text-[10px] text-amber-600 mt-1">Email unverified</div>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {user.last_sign_in_at
                            ? new Date(user.last_sign_in_at).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })
                            : 'Never'}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                              <DropdownMenuLabel className="text-xs">Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() =>
                                  setResetTarget({
                                    userId: user.user_id,
                                    name: user.profiles?.full_name || user.email,
                                  })
                                }
                              >
                                <KeyRound className="mr-2 h-4 w-4" /> Reset Password
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleToggleSuspension(user.user_id, user.is_suspended)}
                              >
                                <Ban className="mr-2 h-4 w-4" />
                                {user.is_suspended ? 'Reactivate' : 'Suspend'}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:bg-destructive/10"
                                onClick={() =>
                                  handleRemove(user.user_id, user.profiles?.full_name || user.email)
                                }
                              >
                                <Trash2 className="mr-2 h-4 w-4" /> Remove User
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ── Create User Dialog ────────────────────────────────────────── */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleCreate}>
            <DialogHeader>
              <DialogTitle>Add New Staff Member</DialogTitle>
              <DialogDescription>
                Create an account and assign a role. The user can log in immediately with the password you set.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="c-email">Email Address *</Label>
                <Input
                  id="c-email"
                  type="email"
                  placeholder="staff@khukuri.com"
                  value={createForm.email}
                  onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="c-name">Full Name *</Label>
                <Input
                  id="c-name"
                  placeholder="Ram Bahadur Shrestha"
                  value={createForm.fullName}
                  onChange={(e) => setCreateForm((f) => ({ ...f, fullName: e.target.value }))}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="c-phone">Phone Number</Label>
                <Input
                  id="c-phone"
                  placeholder="+977 98XXXXXXXX"
                  value={createForm.phone}
                  onChange={(e) => setCreateForm((f) => ({ ...f, phone: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="c-password">
                  Password *
                  <span className="ml-1 text-xs text-muted-foreground font-normal">(min. 8 characters)</span>
                </Label>
                <div className="relative">
                  <Input
                    id="c-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Set a strong password"
                    value={createForm.password}
                    onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
                    required
                    minLength={8}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="c-role">Role *</Label>
                <Select value={createForm.roleId} onValueChange={(v) => setCreateForm((f) => ({ ...f, roleId: v }))} required>
                  <SelectTrigger id="c-role">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.display_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Creating...' : 'Create User'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Reset Password Dialog ─────────────────────────────────────── */}
      <Dialog open={!!resetTarget} onOpenChange={(v) => !v && setResetTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <form onSubmit={handleResetPassword}>
            <DialogHeader>
              <DialogTitle>Reset Password</DialogTitle>
              <DialogDescription>
                Set a new password for <strong>{resetTarget?.name}</strong>.
                They will be able to log in immediately.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label htmlFor="new-password">New Password</Label>
              <div className="relative mt-2">
                <Input
                  id="new-password"
                  type={showNewPassword ? 'text' : 'password'}
                  placeholder="Enter new password (min. 8 chars)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  minLength={8}
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword((v) => !v)}
                  className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setResetTarget(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={resetting}>
                {resetting ? 'Resetting...' : 'Reset Password'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
