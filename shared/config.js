/**
 * Nicotols — Supabase configuration
 *
 * 1. Create a free project at https://supabase.com
 * 2. Go to Project Settings → API
 * 3. Copy "Project URL" and "anon public" key into the values below
 * 4. Run the SQL in docs/STORAGE.md to create the table and RLS policies
 */
const NICOTOLS_CONFIG = {
  supabaseUrl:  'https://kyosyytidfvikxtnhumc.supabase.co',   // e.g. https://xxxx.supabase.co
  supabaseKey:  'sb_publishable_aT-tuvYjm6SwOfcSZSjfUw_rTOCSIpg',
};

window.NICOTOLS_CONFIG = NICOTOLS_CONFIG;
