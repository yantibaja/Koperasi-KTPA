import { createClient } from '@supabase/supabase-js'
import { supabase } from './supabase'
// Klien terpisah untuk pendaftaran: tidak menimpa sesi pengguna yang sedang login & tidak memicu listener auth
export const tempClient = () => createClient(supabase.supabaseUrl, supabase.supabaseKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } })
