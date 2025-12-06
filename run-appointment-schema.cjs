const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Check if we have environment variables or use fallback
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.log('❌ Missing Supabase credentials. Will show SQL to run manually');
  const sql = fs.readFileSync('appointments-schema.sql', 'utf8');
  console.log('\n📄 Please run this SQL in your Supabase dashboard:');
  console.log('='.repeat(50));
  console.log(sql);
  process.exit(0);
}

async function createAppointmentSchema() {
  console.log('🔗 Connecting to Supabase...');
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const sql = fs.readFileSync('appointments-schema.sql', 'utf8');
  console.log('📄 Running appointment schema SQL...');

  try {
    // Split SQL into individual statements
    const statements = sql.split(';').filter(stmt => stmt.trim().length > 0);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim();
      if (statement.length > 0) {
        console.log(`Executing statement ${i + 1}/${statements.length}...`);
        const { data, error } = await supabase.rpc('exec_sql', {
          sql_query: statement + ';'
        });

        if (error) {
          console.error(`❌ Error on statement ${i + 1}:`, error);
          break;
        } else {
          console.log(`✅ Statement ${i + 1} executed successfully`);
        }
      }
    }

    console.log('🎉 Appointment schema setup complete!');
  } catch (err) {
    console.error('❌ Failed to execute SQL:', err.message);
    console.log('\n📄 Please run this SQL manually in your Supabase dashboard:');
    console.log('='.repeat(50));
    console.log(sql);
  }
}

createAppointmentSchema();