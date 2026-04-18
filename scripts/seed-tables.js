const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SECRET_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
  const TOTAL_TABLES = 20;
  console.log(`Seeding ${TOTAL_TABLES} tables...`);

  const tables = [];
  for (let i = 1; i <= TOTAL_TABLES; i++) {
    tables.push({
      table_number: i,
      display_name: `Table ${String(i).padStart(2, '0')}`,
      is_active: true
    });
  }

  const { data, error } = await supabase
    .from('tables')
    .insert(tables)
    .select();

  if (error) {
    console.error('Error seeding tables:', error);
    process.exit(1);
  }

  console.log(`Successfully seeded ${data.length} tables!`);
  console.log('Sample Data:', data[0]);
}

seed();
