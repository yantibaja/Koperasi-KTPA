// Tes koneksi Midtrans. Deploy dengan nama persis: midtrans-cek (Verify JWT nyala)
// Mode Sandbox: juga mencoba membuat 1 QRIS uji Rp1.500 untuk memastikan channel QRIS aktif.
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
    const { data: p } = await sb.from('profiles').select('role').eq('id', user.id).single()
    if (!['admin', 'super_admin'].includes(p?.role)) throw new Error('Hanya admin yang boleh menjalankan tes ini')
    const raw = Deno.env.get('MIDTRANS_SERVER_KEY') ?? '', key = raw.trim().replace(/^["']|["']$/g, '')
    const prodRaw = Deno.env.get('MIDTRANS_PROD') ?? '', prod = prodRaw.trim().toLowerCase() === 'true'
    const acquirer = (Deno.env.get('MIDTRANS_QRIS_ACQUIRER') ?? 'gopay').trim() || 'gopay'
    const base = prod ? 'https://api.midtrans.com' : 'https://api.sandbox.midtrans.com'
    const auth = 'Basic ' + btoa(key + ':')
    const masalah: string[] = []
    if (!raw) masalah.push('MIDTRANS_SERVER_KEY belum diisi di Supabase Secrets.')
    if (raw && raw !== key) masalah.push('Key mengandung spasi atau tanda kutip. Simpan ulang tanpa spasi/kutip.')
    if (prod && key.startsWith('SB-')) masalah.push('MIDTRANS_PROD=true tetapi key adalah key Sandbox (SB-). Samakan keduanya.')
    if (!prod && key && !key.startsWith('SB-')) masalah.push('MIDTRANS_PROD bukan true (Sandbox) tetapi key bukan key Sandbox (tanpa SB-). Samakan keduanya.')
    if (prodRaw && !['true', 'false'].includes(prodRaw.trim().toLowerCase())) masalah.push('MIDTRANS_PROD harus berisi true atau false saja.')
    let pesan = '', diterima = false, qris: { ok: boolean; pesan: string } | null = null
    if (key) {
      const r = await fetch(`${base}/v2/CEK-KOPERASI-${Date.now()}/status`, { headers: { Accept: 'application/json', Authorization: auth } })
      const b = await r.json().catch(() => ({})); const sc = String(b.status_code ?? r.status); pesan = b.status_message || ''
      if (sc === '401') masalah.push('Midtrans menolak key (401 Unknown Merchant). Key salah, tidak lengkap, atau milik lingkungan lain (Sandbox vs Produksi).')
      else diterima = true
      if (diterima && !prod) {
        const hasil: string[] = []; let aktif = false
        for (const ac of [...new Set([acquirer, 'gopay', 'airpay shopee'])]) {
          const r2 = await fetch(`${base}/v2/charge`, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: auth },
            body: JSON.stringify({ payment_type: 'qris', transaction_details: { order_id: `CEK-QRIS-${Date.now()}`, gross_amount: 1500 }, qris: { acquirer: ac } }) })
          const b2 = await r2.json().catch(() => ({})); const ok2 = ['200', '201'].includes(String(b2.status_code)); if (ok2) aktif = true
          hasil.push(`${ac}: ${ok2 ? 'AKTIF' : (b2.status_message || 'gagal') + ' (kode ' + (b2.status_code ?? r2.status) + ')'}`)
        }
        qris = { ok: aktif, pesan: hasil.join(' | ') }
      }
    }
    return j({ ok: diterima && masalah.filter(x => !x.startsWith('Key mengandung')).length === 0, mode: prod ? 'PRODUKSI' : 'SANDBOX', key_awalan: key.slice(0, 11) + '…', key_panjang: key.length, nilai_prod: prodRaw, acquirer, pesan, masalah, qris, qris_dilewati: prod })
  } catch (e) { return j({ error: String((e as Error).message || e) }, 400) }
})
