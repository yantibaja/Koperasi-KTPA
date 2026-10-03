// Deploy dengan "Verify JWT" MATI. URL: https://PROJECT_REF.supabase.co/functions/v1/midtrans-webhook
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
Deno.serve(async (req) => {
  try {
    const b = await req.json()
    const data = new TextEncoder().encode(b.order_id + b.status_code + b.gross_amount + Deno.env.get('MIDTRANS_SERVER_KEY'))
    const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-512', data))).map(x => x.toString(16).padStart(2, '0')).join('')
    if (hash !== b.signature_key) return new Response('invalid signature', { status: 401 })
    const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    if (['settlement', 'capture'].includes(b.transaction_status)) await sb.rpc('tandai_qris_lunas', { p_order: b.order_id })
    else if (['expire', 'cancel', 'deny'].includes(b.transaction_status))
      await sb.from('pembayaran').update({ status: 'gagal' }).eq('midtrans_order_id', b.order_id).eq('status', 'pending')
    return new Response('ok')
  } catch (e) { return new Response(String(e), { status: 400 }) }
})
