const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

const newTables = [
  // Restaurant Inside Area
  { table_number: 'Table 1', section: 'Restaurant Inside Area', capacity: 4 },
  { table_number: 'Table 2', section: 'Restaurant Inside Area', capacity: 4 },
  { table_number: 'Table 3', section: 'Restaurant Inside Area', capacity: 4 },
  { table_number: 'Table 4', section: 'Restaurant Inside Area', capacity: 4 },
  { table_number: 'Table 5', section: 'Restaurant Inside Area', capacity: 4 },
  { table_number: 'Cabin 1', section: 'Restaurant Inside Area', capacity: 8 },
  { table_number: 'Cabin 2', section: 'Restaurant Inside Area', capacity: 8 },
  
  // Back Area
  { table_number: 'Cabin 3', section: 'Back of Restaurant', capacity: 8 },

  // Swimming Pool Area
  { table_number: 'Pool Table 1', section: 'Swimming Pool Area', capacity: 4 },
  { table_number: 'Pool Table 2', section: 'Swimming Pool Area', capacity: 4 },
  { table_number: 'Pool Table 3', section: 'Swimming Pool Area', capacity: 4 },
  { table_number: 'Pool Table 4', section: 'Swimming Pool Area', capacity: 4 },
  { table_number: 'Pool Cabin 1', section: 'Swimming Pool Area', capacity: 8 },
  { table_number: 'Pool Cabin 2', section: 'Swimming Pool Area', capacity: 8 },
  { table_number: 'Pool Cabin 3', section: 'Swimming Pool Area', capacity: 8 },

  // Room Area
  { table_number: 'Room Table 1', section: 'Room Area', capacity: 4 },
  { table_number: 'Room Table 2', section: 'Room Area', capacity: 4 },
  { table_number: 'Room Table 3', section: 'Room Area', capacity: 4 },
  { table_number: 'Room Table 4', section: 'Room Area', capacity: 4 },
  { table_number: 'Room Table 5', section: 'Room Area', capacity: 4 },
  { table_number: 'Room Table 6', section: 'Room Area', capacity: 4 },
  { table_number: 'Room Cabin 1', section: 'Room Area', capacity: 8 },
  { table_number: 'Room Cabin 2', section: 'Room Area', capacity: 8 },

  // Tower Area
  { table_number: 'Tower Cabin 1', section: 'Tower Area', capacity: 8 },
  { table_number: 'Tower Cabin 2', section: 'Tower Area', capacity: 8 },
]

async function seedTables() {
  console.log('Fetching restaurant ID...')
  const { data: restaurants, error: rError } = await supabase.from('restaurants').select('id').limit(1)
  if (rError || !restaurants.length) {
    console.error('Error fetching restaurant', rError)
    return
  }
  const restaurantId = restaurants[0].id

  console.log(`Deactivating and renaming current tables for restaurant ${restaurantId}...`)
  
  const { data: existingTables, error: fetchError } = await supabase
    .from('restaurant_tables')
    .select('id, table_number')
    .eq('restaurant_id', restaurantId)

  if (fetchError) {
    console.error('Error fetching old tables:', fetchError)
    return
  }

  for (const t of existingTables) {
    await supabase
      .from('restaurant_tables')
      .update({ 
        is_active: false, 
        table_number: `${t.table_number} (archived ${Date.now()})` 
      })
      .eq('id', t.id)
  }

  console.log('Inserting new tables...')
  const payload = newTables.map(t => ({
    ...t,
    restaurant_id: restaurantId,
    status: 'available',
    is_active: true
  }))

  const { data, error } = await supabase
    .from('restaurant_tables')
    .insert(payload)

  if (error) {
    console.error('Error inserting new tables:', error)
  } else {
    console.log('Successfully inserted new physical tables!')
  }
}

seedTables()
