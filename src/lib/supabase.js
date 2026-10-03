import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  'https://gdwtnwsmiykobbfkfqae.supabase.co',
  'ISI_DENGAN_ANON_PUBLIC_KEY'
)

export const upload = async (bucket, file, uid) => {
  const path = `${uid}/${Date.now()}-${file.name}`
  const { error } = await supabase.storage.from(bucket).upload(path, file)
  if (error) throw error
  return path
}
