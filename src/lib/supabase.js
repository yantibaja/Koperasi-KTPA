import { createClient } from '@supabase/supabase-js'
export const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY)
export const upload = async (bucket, file, uid) => {
  const path = `${uid}/${Date.now()}-${file.name}`
  const { error } = await supabase.storage.from(bucket).upload(path, file); if (error) throw error
  return path
}
