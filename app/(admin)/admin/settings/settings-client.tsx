'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'
import { Settings, Save, Percent, Building2, MapPin, Globe, Phone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { updateSettings } from '@/lib/actions/admin.actions'

export default function SettingsClient({ settings, restaurant }: { settings: any, restaurant: any }) {
  const [isPending, startTransition] = useTransition()

  async function handleSaveSettings(fd: FormData) {
    const payload = {
      tax_rate: parseFloat(fd.get('tax_rate') as string) || 0,
      service_charge_rate: parseFloat(fd.get('service_charge_rate') as string) || 0,
      pool_adult_price: parseFloat(fd.get('pool_adult_price') as string) || 0,
      pool_child_price: parseFloat(fd.get('pool_child_price') as string) || 0,
      pool_family_price: parseFloat(fd.get('pool_family_price') as string) || 0,
    }

    startTransition(async () => {
      const res = await updateSettings(payload)
      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success('Settings updated successfully')
      }
    })
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Settings className="h-8 w-8 text-primary" /> Settings
        </h1>
        <p className="text-muted-foreground">Manage your restaurant configuration, taxes, and pricing.</p>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="billing">Financial & Taxes</TabsTrigger>
          <TabsTrigger value="pool">Pool Pricing</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>Restaurant Information</CardTitle>
              <CardDescription>Basic details about your business. (Read-only)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Business Name</Label>
                  <div className="flex items-center gap-2 px-3 py-2 border rounded-md bg-muted/50 text-sm">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    {restaurant.name}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Slug / Subdomain</Label>
                  <div className="flex items-center gap-2 px-3 py-2 border rounded-md bg-muted/50 text-sm">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    {restaurant.slug}
                  </div>
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Address</Label>
                  <div className="flex items-center gap-2 px-3 py-2 border rounded-md bg-muted/50 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    {restaurant.address || 'Not provided'}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Contact Phone</Label>
                  <div className="flex items-center gap-2 px-3 py-2 border rounded-md bg-muted/50 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    {restaurant.phone || 'Not provided'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <form action={handleSaveSettings}>
          <TabsContent value="billing" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Tax & Service Charge</CardTitle>
                <CardDescription>Configure the default rates applied to POS and Room orders.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Value Added Tax (VAT) %</Label>
                    <div className="relative">
                      <Percent className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input name="tax_rate" type="number" step="0.01" defaultValue={settings.tax_rate} className="pl-9" />
                    </div>
                    <p className="text-[10px] text-muted-foreground">Standard VAT rate in Nepal is usually 13%.</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Service Charge %</Label>
                    <div className="relative">
                      <Percent className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input name="service_charge_rate" type="number" step="0.01" defaultValue={settings.service_charge_rate} className="pl-9" />
                    </div>
                    <p className="text-[10px] text-muted-foreground">Standard service charge is usually 10%.</p>
                  </div>
                </div>
                <Button type="submit" disabled={isPending}>
                  <Save className="mr-2 h-4 w-4" /> {isPending ? 'Saving...' : 'Save Financial Settings'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pool" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Pool Ticket Pricing</CardTitle>
                <CardDescription>Set the standard prices for swimming pool access (in NPR).</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Adult Price</Label>
                    <Input name="pool_adult_price" type="number" defaultValue={settings.pool_adult_price} />
                  </div>
                  <div className="space-y-2">
                    <Label>Child Price</Label>
                    <Input name="pool_child_price" type="number" defaultValue={settings.pool_child_price} />
                  </div>
                  <div className="space-y-2">
                    <Label>Family Package</Label>
                    <Input name="pool_family_price" type="number" defaultValue={settings.pool_family_price} />
                  </div>
                </div>
                <Button type="submit" disabled={isPending}>
                  <Save className="mr-2 h-4 w-4" /> {isPending ? 'Saving...' : 'Save Pool Pricing'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </form>
      </Tabs>
    </div>
  )
}
