import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function seed() {
  console.log('Reading old_page.tsx...')
  const content = fs.readFileSync('old_page.tsx', 'utf-8')
  
  const startStr = "const menuData = {"
  const startIndex = content.indexOf(startStr)
  if (startIndex === -1) {
      console.error("menuData not found")
      process.exit(1)
  }

  let openBraces = 0
  let endIndex = -1
  for (let i = startIndex + startStr.length - 1; i < content.length; i++) {
      if (content[i] === '{') openBraces++
      if (content[i] === '}') {
          openBraces--
          if (openBraces === 0) {
              endIndex = i + 1
              break
          }
      }
  }

  const menuDataStr = content.substring(startIndex + 'const menuData = '.length, endIndex)
  
  // Clean up the string so eval works (it has some TS formatting)
  let obj
  try {
    // using eval to parse the JS object literal into a JS object
    // the object literal has trailing commas and unquoted keys so JSON.parse won't work
    obj = eval('(' + menuDataStr + ')')
  } catch(e) {
    console.error("Failed to parse menuData object", e)
    process.exit(1)
  }

  const restaurantId = '11111111-1111-1111-1111-111111111111' // Need to get the first restaurant ID
  
  const { data: rest } = await supabase.from('restaurants').select('id').limit(1).maybeSingle()
  let rId = rest ? rest.id : null

  if (!rId) {
    console.log('No restaurant found. Creating default restaurant...')
    const { data: newRest, error: rErr } = await supabase.from('restaurants').insert({
      name: 'Khukuri Restaurant',
      slug: 'khukuri',
      address: 'Nepal',
      is_active: true
    }).select('id').single()

    if (rErr || !newRest) {
      console.error('Failed to create restaurant:', rErr)
      process.exit(1)
    }
    rId = newRest.id
  }

  console.log(`Using restaurant ID: ${rId}`)

  console.log('Wiping old menu categories...')
  await supabase.from('menu_categories').delete().neq('id', '00000000-0000-0000-0000-000000000000')

  let catOrder = 0
  for (const [categoryName, items] of Object.entries(obj)) {
    console.log(`Processing category: ${categoryName}`)
    catOrder++
    
    // 1. Insert Category
    const { data: category, error: catError } = await supabase
      .from('menu_categories')
      .insert({
        restaurant_id: rId,
        name: categoryName,
        slug: categoryName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
        description: `${categoryName} items`,
        is_active: true,
        sort_order: catOrder
      })
      .select()
      .single()

    if (catError) {
      console.error(`Failed to insert category ${categoryName}:`, catError)
      continue
    }

    // 2. Insert Items
    const itemsToInsert = (items as any[]).map((item: any, i) => {
      const baseSlug = item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
      const catSlug = categoryName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
      const parsedPrice = parseFloat(item.price)
      
      return {
        restaurant_id: rId,
        category_id: category.id,
        name: item.name,
        slug: `${baseSlug}-${catSlug}-${i}`,
        description: item.description || '',
        price: isNaN(parsedPrice) ? 0 : parsedPrice,
        image_url: item.image || null,
        is_available: true,
        is_popular: !!item.popular,
        is_featured: !!item.popular,
        is_vegetarian: !!item.veg,
        is_vegan: false,
        spice_level: 0,
        preparation_time: 15,
        sort_order: i + 1
      }
    })

    const { error: itemsError } = await supabase
      .from('menu_items')
      .insert(itemsToInsert)

    if (itemsError) {
      console.error(`Failed to insert items for ${categoryName}:`, itemsError)
    } else {
      console.log(`Inserted ${(items as any[]).length} items for ${categoryName}`)
    }
  }
  
  console.log('Seeding complete!')
}

seed().catch(console.error)
