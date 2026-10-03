// Jadwalkan tiap hari 00:05 WIB (17:05 UTC): supabase cron / pg_cron -> panggil function ini
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
Deno.serve(async () => {
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const today = new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10)
  await sb.rpc('hitung_denda')
  const { data: late } = await sb.from('angsuran').select('id,koperasi_id,penagih_id').eq('status', 'belum').lt('jatuh_tempo', today)
  let n = 0
  for (const a of late ?? []) {
    const { data: libur } = await sb.from('tanggal_merah').select('id').eq('koperasi_id', a.koperasi_id).eq('tanggal', today).maybeSingle()
    if (libur) continue
    const { data: pen } = a.penagih_id ? { data: { id: a.penagih_id } } : await sb.from('profiles').select('id').eq('koperasi_id', a.koperasi_id).eq('role', 'penagih').eq('status', 'approved').limit(1).maybeSingle()
    const { error } = await sb.from('tugas_tagih').upsert({ koperasi_id: a.koperasi_id, angsuran_id: a.id, penagih_id: pen?.id ?? null }, { onConflict: 'angsuran_id', ignoreDuplicates: true })
    if (!error) n++
  }
  return new Response(JSON.stringify({ tugas_dibuat: n }))
})
