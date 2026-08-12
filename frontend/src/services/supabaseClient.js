import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://uwtbxipuwtbcebu9n7gl.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_G_UrtxiPuwtb_cE-bu9n7g_Lc7dB1E0';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
