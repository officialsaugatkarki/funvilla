'use client'

import { useState } from 'react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { Download, FileText, Calendar as CalendarIcon } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'

interface ReportsClientProps {
  initialRevenueData: any[]
  inventoryData: any[]
  bookingsData: any[]
  poolData: any[]
  staffData: any[]
}

export default function ReportsClient({
  initialRevenueData,
  inventoryData,
  bookingsData,
  poolData,
  staffData
}: ReportsClientProps) {
  const [activeTab, setActiveTab] = useState('revenue')
  const [revenueRange, setRevenueRange] = useState('month')

  // Calculate KPIs
  const totalRevenue = initialRevenueData.reduce((sum, day) => sum + day.revenue, 0)
  const totalOrders = initialRevenueData.reduce((sum, day) => sum + day.orders, 0)
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0

  function downloadCSV(data: any[], filename: string) {
    if (!data.length) return
    const headers = Object.keys(data[0])
    const csv = [
      headers.join(','),
      ...data.map(row => headers.map(header => JSON.stringify(row[header] ?? '')).join(','))
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${filename}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleExportCSV() {
    switch(activeTab) {
      case 'revenue': downloadCSV(initialRevenueData, 'revenue_report'); break
      case 'inventory': downloadCSV(inventoryData, 'inventory_report'); break
      case 'rooms': downloadCSV(bookingsData, 'rooms_report'); break
      case 'pool': downloadCSV(poolData, 'pool_report'); break
      case 'staff': downloadCSV(staffData, 'staff_report'); break
    }
  }

  function handleExportPDF() {
    window.print()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full max-w-3xl">
          <TabsList className="flex overflow-x-auto w-full max-w-full justify-start md:grid md:grid-cols-5 h-auto p-1">
            <TabsTrigger value="revenue">Revenue</TabsTrigger>
            <TabsTrigger value="inventory">Inventory</TabsTrigger>
            <TabsTrigger value="rooms">Rooms</TabsTrigger>
            <TabsTrigger value="pool">Pool</TabsTrigger>
            <TabsTrigger value="staff">Staff</TabsTrigger>
          </TabsList>
        </Tabs>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
          <Button variant="outline" onClick={handleExportPDF}>
            <FileText className="mr-2 h-4 w-4" /> Print PDF
          </Button>
        </div>
      </div>

      <div className="print-content block">
        {activeTab === 'revenue' && (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">NPR {totalRevenue.toLocaleString()}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalOrders}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">NPR {Math.round(avgOrderValue).toLocaleString()}</div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Daily Revenue</CardTitle>
                  <CardDescription>Revenue overview over time</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={initialRevenueData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `NPR ${value}`} />
                      <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px' }} />
                      <Bar dataKey="revenue" fill="currentColor" className="fill-primary" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'inventory' && (
          <Card>
            <CardHeader><CardTitle>Inventory Status</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Current Qty</TableHead>
                    <TableHead>Min Qty</TableHead>
                    <TableHead>Unit Cost</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inventoryData.map(item => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>{item.category}</TableCell>
                      <TableCell>{item.quantity} {item.unit}</TableCell>
                      <TableCell>{item.min_quantity} {item.unit}</TableCell>
                      <TableCell>NPR {item.cost_per_unit}</TableCell>
                      <TableCell>
                        {item.quantity <= item.min_quantity ? (
                          <Badge variant="destructive">Low Stock</Badge>
                        ) : (
                          <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">In Stock</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {activeTab === 'rooms' && (
          <Card>
            <CardHeader><CardTitle>Room Occupancy</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Guest</TableHead>
                    <TableHead>Room</TableHead>
                    <TableHead>Check In</TableHead>
                    <TableHead>Check Out</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bookingsData.map(booking => (
                    <TableRow key={booking.id}>
                      <TableCell className="font-medium">{booking.guest_name}</TableCell>
                      <TableCell>{booking.rooms?.room_number}</TableCell>
                      <TableCell>{new Date(booking.check_in_date).toLocaleDateString()}</TableCell>
                      <TableCell>{new Date(booking.check_out_date).toLocaleDateString()}</TableCell>
                      <TableCell>NPR {booking.total_amount}</TableCell>
                      <TableCell>
                        <Badge variant={booking.status === 'confirmed' ? 'default' : 'secondary'}>
                          {booking.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {activeTab === 'pool' && (
          <Card>
            <CardHeader><CardTitle>Pool Revenue</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Ticket Type</TableHead>
                    <TableHead>Guest Name</TableHead>
                    <TableHead>Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {poolData.map(ticket => (
                    <TableRow key={ticket.id}>
                      <TableCell>{new Date(ticket.valid_date).toLocaleDateString()}</TableCell>
                      <TableCell className="capitalize">{ticket.ticket_type}</TableCell>
                      <TableCell>{ticket.guest_name || 'Walk-in'}</TableCell>
                      <TableCell>NPR {ticket.price}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {activeTab === 'staff' && (
          <Card>
            <CardHeader><CardTitle>Employee Roster</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Hire Date</TableHead>
                    <TableHead>Salary</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staffData.map(staff => (
                    <TableRow key={staff.id}>
                      <TableCell className="font-medium">{staff.profiles?.full_name}</TableCell>
                      <TableCell>{staff.department}</TableCell>
                      <TableCell>{staff.position}</TableCell>
                      <TableCell>{staff.hire_date ? new Date(staff.hire_date).toLocaleDateString() : 'N/A'}</TableCell>
                      <TableCell>NPR {staff.salary}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          .no-print, .hidden, nav, header { display: none !important; }
          .print-content { display: block !important; width: 100% !important; margin: 0 !important; padding: 0 !important; }
        }
      `}} />
    </div>
  )
}
