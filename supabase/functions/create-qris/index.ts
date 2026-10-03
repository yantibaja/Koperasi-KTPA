// secrets: MIDTRANS_SERVER_KEY, MIDTRANS_PROD (true/false)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' }
const j = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } })
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const url = Deno.env.get('SUPABASE_URL')!
    const me = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: req.headers.get('Authorization')! } } })
    const { data: { user } } = await me.auth.getUser(); if (!user) throw new Error('Unauthorized')
    const sb = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { angsuran_id } = await req.json()
    const { data: p } = await sb.from('profiles').select('role,koperasi_id').eq('id', user.id).single()
    const { data: a } = await sb.from('angsuran').select('*').eq('id', angsuran_id).eq('status', 'belum').single()
    if (!a) throw new Error('Tagihan tidak ditemukan')
    const ok = a.nasabah_id === user.id || (['admin', 'super_admin'].includes(p?.role) && (p.role === 'super_admin' || p.koperasi_id === a.koperasi_id))
    if (!ok) throw new Error('Tidak berwenang')
    const total = Math.round(Number(a.jumlah) + Number(a.denda)), order_id = `KOP-${a.id.slice(0, 8)}-${Date.now()}`
    const base = Deno.env.get('MIDTRANS_PROD') === 'true' ? 'https://api.midtrans.com' : 'https://api.sandbox.midtrans.com'
    const res = await fetch(`${base}/v2/charge`, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: 'Basic ' + btoa(Deno.env.get('MIDTRANS_SERVER_KEY')! + ':') },
      body: JSON.stringify({ payment_type: 'qris', transaction_details: { order_id, gross_amount: total }, qris: { acquirer: 'gopay' } }) })
    const m = await res.json(); if (!['200', '201'].includes(m.status_code)) throw new Error(m.status_message)
    await sb.from('pembayaran').insert({ angsuran_id, koperasi_id: a.koperasi_id, nasabah_id: a.nasabah_id, metode: 'QRIS', jumlah: total, midtrans_order_id: order_id, dibuat_oleh: user.id })
    return j({ order_id, qr_url: m.actions?.find((x: any) => x.name === 'generate-qr-code')?.url, qr_string: m.qr_string, total })
  } catch (e) { return j({ error: String((e as Error).message || e) }, 400) }
})
