const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Parse .env.local
const envPath = path.join(__dirname, '..', '.env.local');
const env = {};
for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
  const eqIndex = line.indexOf('=');
  if (eqIndex > 0) {
    const key = line.slice(0, eqIndex).trim();
    const value = line.slice(eqIndex + 1).trim();
    env[key] = value;
  }
}

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const draftsDir = path.join(__dirname, '..', 'description-drafts');

async function run() {
  const files = fs.readdirSync(draftsDir).filter(f => f.endsWith('.md'));
  console.log(`Found ${files.length} description files\n`);

  let success = 0;
  let failed = 0;
  let skipped = 0;

  for (const file of files) {
    const slug = file.replace('.md', '');
    const description = fs.readFileSync(path.join(draftsDir, file), 'utf8').trim();

    // Check the portfolio exists first
    const { data, error: fetchError } = await supabase
      .from('portfolios')
      .select('slug')
      .eq('slug', slug)
      .single();

    if (fetchError || !data) {
      console.log(`  skipped  ${slug} (not found in DB)`);
      skipped++;
      continue;
    }

    const { error } = await supabase
      .from('portfolios')
      .update({ description })
      .eq('slug', slug);

    if (error) {
      console.error(`  failed   ${slug}: ${error.message}`);
      failed++;
    } else {
      console.log(`  updated  ${slug}`);
      success++;
    }
  }

  console.log(`\n${success} updated, ${skipped} skipped (slug not in DB), ${failed} failed`);
}

run();
