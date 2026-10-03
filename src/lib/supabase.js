import { createClient } from '@supabase/supabase-js'
export const supabase = createClient(import.meta.env.https://gdwtnwsmiykobbfkfqae.supabase.co, import.meta.env.eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdkd3Rud3NtaXlrb2JiZmtmcWFlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEwMjc5MDMsImV4cCI6MjEwNjYwMzkwM30.YMMmdQlD1JznzkhH-wEn0Gv7dkZSltPI98Sd1K8yfoU)
export const upload = async (bucket, file, uid) => {
  const path = `${uid}/${Date.now()}-${file.name}`
  const { error } = await supabase.storage.from(bucket).upload(path, file); if (error) throw error
  return path
}
