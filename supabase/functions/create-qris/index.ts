// supabase functions deploy create-qris ; secrets: MIDTRANS_SERVER_KEY, MIDTRANS_PROD (true/false)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type' }
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: req.headers.get('Authorization')! } } })
    const { data: { user } } = await sb.auth.getUser(); if (!user) throw new Error('Unauthorized')
    const { angsuran_id } = await req.json()
    const { data: a } = await sb.from('angsuran').select('*').eq('id', angsuran_id).eq('nasabah_id', user.id).single()
    if (!a) throw new Error('Tagihan tidak ditemukan')
    const total = Math.round(Number(a.jumlah) + Number(a.denda)); const order_id = `KOP-${a.id.slice(0, 8)}-${Date.now()}`
    const base = Deno.env.get('MIDTRANS_PROD') === 'true' ? 'https://api.midtrans.com' : 'https://api.sandbox.midtrans.com'
    const res = await fetch(`${base}/v2/charge`, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json',
      Authorization: 'Basic ' + btoa(Deno.env.get('MIDTRANS_SERVER_KEY')! + ':') },
      body: JSON.stringify({ payment_type: 'qris', transaction_details: { order_id, gross_amount: total }, qris: { acquirer: 'gopay' } }) })
    const m = await res.json(); if (!['200', '201'].includes(m.status_code)) throw new Error(m.status_message)
    await sb.from('pembayaran').insert({ angsuran_id, koperasi_id: a.koperasi_id, nasabah_id: user.id, metode: 'QRIS', jumlah: total, midtrans_order_id: order_id })
    const qr = m.actions?.find((x: any) => x.name === 'generate-qr-code')?.url
    return new Response(JSON.stringify({ order_id, qr_url: qr, qr_string: m.qr_string, total }), { headers: { ...cors, 'Content-Type': 'application/json' } })
  } catch (e) { return new Response(JSON.stringify({ error: String(e.message || e) }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } }) }
})
// TODO: buat function 'midtrans-webhook' (verifikasi signature_key SHA512) untuk set pembayaran.status='sukses' & angsuran.status='lunas', lalu daftarkan URL-nya di dashboard Midtrans.
