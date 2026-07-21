'use client'

import { useState } from 'react'
import { Users, Search, Mail, Phone, MapPin, Tag } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'

export default function CustomersClient({ customers }: { customers: any[] }) {
  const [search, setSearch] = useState('')

  const filtered = customers.filter(c => 
    !search || 
    c.full_name.toLowerCase().includes(search.toLowerCase()) || 
    (c.email && c.email.toLowerCase().includes(search.toLowerCase())) ||
    (c.phone && c.phone.includes(search))
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Users className="h-8 w-8 text-primary" /> Customers Directory
          </h1>
          <p className="text-muted-foreground">{customers.length} registered customers</p>
        </div>
        <Button>Add Customer</Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search by name, email, or phone..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground border rounded-xl bg-card border-dashed">
          <Users className="h-12 w-12 opacity-20 mb-4" />
          <p className="text-lg font-medium">No customers found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(c => (
            <div key={c.id} className="bg-card border rounded-xl p-5 hover:border-primary/50 hover:shadow-md transition-all group">
              <div className="flex items-start gap-4 mb-4">
                <Avatar className="h-12 w-12 border-2 border-primary/10 bg-primary/5 group-hover:border-primary/30 transition-colors">
                  <AvatarFallback className="text-primary font-bold text-lg">
                    {c.full_name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground truncate">{c.full_name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Customer since {new Date(c.created_at).getFullYear()}</p>
                  {c.tags && c.tags.length > 0 && (
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {c.tags.map((tag: string) => (
                        <Badge key={tag} variant="secondary" className="text-[9px] px-1.5 py-0 font-medium">
                          <Tag className="h-2 w-2 mr-1 inline" /> {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="space-y-2.5 text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg border">
                {c.email ? (
                  <p className="flex items-center gap-2.5"><Mail className="h-3.5 w-3.5 text-primary/70 shrink-0" /> <span className="truncate">{c.email}</span></p>
                ) : (
                  <p className="flex items-center gap-2.5 opacity-50"><Mail className="h-3.5 w-3.5 shrink-0" /> <span className="italic text-xs">No email</span></p>
                )}
                {c.phone ? (
                  <p className="flex items-center gap-2.5"><Phone className="h-3.5 w-3.5 text-primary/70 shrink-0" /> {c.phone}</p>
                ) : (
                  <p className="flex items-center gap-2.5 opacity-50"><Phone className="h-3.5 w-3.5 shrink-0" /> <span className="italic text-xs">No phone</span></p>
                )}
                {c.address && (
                  <p className="flex items-start gap-2.5 mt-2 pt-2 border-t">
                    <MapPin className="h-3.5 w-3.5 text-primary/70 shrink-0 mt-0.5" /> 
                    <span className="line-clamp-2 text-xs leading-relaxed">{c.address}</span>
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
