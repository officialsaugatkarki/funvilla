'use client'

import { useState } from 'react'
import { BadgeCheck, Plus, UserX, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { createStaff, deactivateStaff } from '@/lib/actions/employees.actions'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'

export default function EmployeesClient({ initialStaff, systemUsers }: { initialStaff: any[], systemUsers: any[] }) {
  const [staff, setStaff] = useState<any[]>(initialStaff)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Form State
  const [userId, setUserId] = useState<string>('none')
  const [department, setDepartment] = useState('')
  const [position, setPosition] = useState('')
  const [salary, setSalary] = useState('')
  const [hireDate, setHireDate] = useState(new Date().toISOString().split('T')[0])
  const [shiftStart, setShiftStart] = useState('')
  const [shiftEnd, setShiftEnd] = useState('')

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!department || !position || !salary || !hireDate) {
      toast.error('Please fill required fields')
      return
    }

    setSubmitting(true)
    const { error } = await createStaff({
      userId: userId === 'none' ? null : userId,
      department,
      position,
      salary: parseFloat(salary),
      hireDate,
      shiftStart: shiftStart || null,
      shiftEnd: shiftEnd || null
    })

    if (error) {
      toast.error(error)
    } else {
      toast.success('Employee record created')
      setIsCreateOpen(false)
      window.location.reload() // Quick reload to get fresh join data
    }
    setSubmitting(false)
  }

  async function handleDeactivate(id: string) {
    if (!confirm('Deactivate this employee record?')) return
    const { error } = await deactivateStaff(id)
    if (error) toast.error(error)
    else {
      toast.success('Employee deactivated')
      setStaff(staff.filter(s => s.id !== id))
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <BadgeCheck className="h-8 w-8 text-primary" /> Staff Management
          </h1>
          <p className="text-muted-foreground">Manage employee records, shifts, and payroll details.</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add Employee Record
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Salary</TableHead>
                <TableHead>Shift</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staff.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No active employee records.</TableCell></TableRow>
              ) : (
                staff.map((emp) => (
                  <TableRow key={emp.id}>
                    <TableCell>
                      {emp.user_id ? (
                        <div>
                          <div className="font-medium">{emp.profiles?.full_name || 'System User'}</div>
                          <div className="text-xs text-muted-foreground">Linked Account</div>
                        </div>
                      ) : (
                        <div className="font-medium">Unlinked Record</div>
                      )}
                    </TableCell>
                    <TableCell>{emp.department}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{emp.position}</Badge>
                      {emp.user_roles?.[0] && (
                        <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          System: {emp.user_roles[0].roles.display_name}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>Rs. {emp.salary?.toLocaleString()}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {emp.shift_start ? `${emp.shift_start} - ${emp.shift_end}` : 'Not set'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeactivate(emp.id)}>
                        <UserX className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <form onSubmit={handleCreate}>
            <DialogHeader>
              <DialogTitle>Add Employee Record</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Link to System User (Optional)</Label>
                <Select value={userId} onValueChange={setUserId}>
                  <SelectTrigger><SelectValue placeholder="Select user" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No linked account</SelectItem>
                    {systemUsers.map((u) => (
                      <SelectItem key={u.user_id} value={u.user_id}>
                        {u.profiles?.full_name || u.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Linking an account connects HR data to their login.</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Department</Label>
                  <Input value={department} onChange={e => setDepartment(e.target.value)} required placeholder="Kitchen" />
                </div>
                <div className="grid gap-2">
                  <Label>Job Title</Label>
                  <Input value={position} onChange={e => setPosition(e.target.value)} required placeholder="Sous Chef" />
                </div>
                <div className="grid gap-2">
                  <Label>Monthly Salary (NPR)</Label>
                  <Input type="number" value={salary} onChange={e => setSalary(e.target.value)} required />
                </div>
                <div className="grid gap-2">
                  <Label>Hire Date</Label>
                  <Input type="date" value={hireDate} onChange={e => setHireDate(e.target.value)} required />
                </div>
                <div className="grid gap-2">
                  <Label>Shift Start</Label>
                  <Input type="time" value={shiftStart} onChange={e => setShiftStart(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label>Shift End</Label>
                  <Input type="time" value={shiftEnd} onChange={e => setShiftEnd(e.target.value)} />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={submitting}>{submitting ? 'Creating...' : 'Create Record'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
