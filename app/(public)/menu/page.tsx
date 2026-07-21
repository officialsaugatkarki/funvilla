import { createClient } from '@/lib/supabase/server'
import MenuClient from './menu-client'

// Always fetch fresh data
export const revalidate = 0

export default async function MenuPage() {
  const supabase = await createClient()

  // Fetch active categories
  const { data: categories } = await supabase
    .from('menu_categories')
    .select('*')
    .eq('is_active', true)
    .order('sort_order')

  // Fetch active menu items
  const { data: items } = await supabase
    .from('menu_items')
    .select('*, menu_categories(name)')
    .eq('is_available', true)
    .order('sort_order')

  // Format data for the client component
  const menuData: Record<string, any[]> = {}
  
  if (categories && items) {
    categories.forEach(cat => {
      menuData[cat.name] = items
        .filter(item => item.category_id === cat.id)
        .map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          description: item.description,
          image: item.image_url || '/images/placeholder.jpg',
          categoryName: cat.name
        }))
    })
  }

  return <MenuClient initialMenuData={menuData} />
}
