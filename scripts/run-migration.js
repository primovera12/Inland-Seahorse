const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://nsqcttbciocfumhvdnod.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zcWN0dGJjaW9jZnVtaHZkbm9kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4MTA5MDAsImV4cCI6MjA4MzM4NjkwMH0.0LIqFwwWAlyIrpT10BQrPn9yHFR2c6ZP6sFjkYT0wEQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  console.log('Running migration to add terms columns...');

  const { data, error } = await supabase.rpc('exec_sql', {
    sql: `
      ALTER TABLE company_settings
        ADD COLUMN IF NOT EXISTS terms_dismantle TEXT,
        ADD COLUMN IF NOT EXISTS terms_inland TEXT,
        ADD COLUMN IF NOT EXISTS terms_version INTEGER NOT NULL DEFAULT 1;
    `
  });

  if (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }

  console.log('Migration completed successfully!');
  process.exit(0);
}

runMigration();
