import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://cpweftcxomtjfxmkqmmx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNwd2VmdGN4b210amZ4bWtxbW14Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5ODAxOTgsImV4cCI6MjA5MDU1NjE5OH0.hH9kW9fHocY1_xf_GixzHio_Lh7wNvtXZsJOEwRWB_4';
const BASE_URL = 'https://portfoliodb-five.vercel.app/portfolios';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const { data, error } = await supabase.from('portfolios').select('slug');
if (error) {
  console.error('Failed to fetch slugs:', error.message);
  process.exit(1);
}

const slugs = data.map(r => r.slug);
console.log(`Checking ${slugs.length} portfolio URLs...\n`);

const failures = [];

await Promise.all(slugs.map(async (slug) => {
  const url = `${BASE_URL}/${slug}`;
  try {
    const res = await fetch(url);
    if (res.status !== 200) {
      failures.push({ slug, status: res.status, url });
      console.log(`FAIL [${res.status}] ${url}`);
    }
  } catch (err) {
    failures.push({ slug, status: 'ERROR', url });
    console.log(`ERROR ${url} — ${err.message}`);
  }
}));

console.log(`\nDone. ${failures.length} issue(s) found out of ${slugs.length} URLs.`);
if (failures.length === 0) console.log('All pages returned 200 OK.');
