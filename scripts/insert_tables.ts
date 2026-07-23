import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: restaurant } = await supabase.from('restaurants').select('id').eq('slug', 'khukuri').single();
  if (!restaurant) {
    console.error('Restaurant not found');
    return;
  }

  const tables = [
    { restaurant_id: restaurant.id, table_number: 'Table 1', capacity: 4, section: 'Main Hall', status: 'available', is_active: true },
    { restaurant_id: restaurant.id, table_number: 'Table 2', capacity: 4, section: 'Main Hall', status: 'available', is_active: true },
    { restaurant_id: restaurant.id, table_number: 'Table 3', capacity: 4, section: 'Main Hall', status: 'available', is_active: true },
    { restaurant_id: restaurant.id, table_number: 'Table 4', capacity: 6, section: 'Main Hall', status: 'available', is_active: true },
    { restaurant_id: restaurant.id, table_number: 'Table 5', capacity: 6, section: 'Main Hall', status: 'available', is_active: true },
    { restaurant_id: restaurant.id, table_number: 'Cabin 1', capacity: 6, section: 'Private', status: 'available', is_active: true },
    { restaurant_id: restaurant.id, table_number: 'Cabin 2', capacity: 6, section: 'Private', status: 'available', is_active: true },
    { restaurant_id: restaurant.id, table_number: 'Cabin 3', capacity: 8, section: 'Private', status: 'available', is_active: true },
    { restaurant_id: restaurant.id, table_number: 'Cabin 4', capacity: 8, section: 'Private', status: 'available', is_active: true },
    { restaurant_id: restaurant.id, table_number: 'Cabin 5', capacity: 10, section: 'Private', status: 'available', is_active: true },
  ];

  for (const t of tables) {
    const { error } = await supabase.from('restaurant_tables').upsert(t, { onConflict: 'restaurant_id, table_number' });
    if (error) console.error('Error inserting', t.table_number, error);
  }
  console.log('Tables inserted');
}
run();
