import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useToast } from '../lib/toast'
export default function TesMidtrans() {
  const toast = useToast(), [busy, setBusy] = useState(false), [res, setRes] = useState(null)
  const tes = async () => {
    setBusy(true); setRes(null)
    const { data, error } = await supabase.functions.invoke('midtrans-cek')
    if (error || data?.error) {
      let msg = data?.error || error.message
      if (error?.context?.json) { const b = await error.context.json().catch(() => null); if (b?.error) msg = b.error }
      if (error?.name === 'FunctionsFetchError') msg = 'Function midtrans-cek belum di-deploy (namanya harus persis midtrans-cek).'
      toast.error('Tes gagal', msg)
    } else setRes(data)
    setBusy(false)
  }
  return <div className="card space-y-3"><div className="flex items-center justify-between"><h2 className="font-bold">🔌 Tes koneksi Midtrans</h2><span className="text-[11px] bg-amber-100 text-amber-700 rounded-full px-2 py-1 font-bold">Hanya pemilik</span></div>
    <p className="text-xs text-slate-500">Memeriksa Server Key dan mode (Sandbox/Produksi) tanpa membuat transaksi.</p>
    <button className="btn w-full" disabled={busy} onClick={tes}>{busy ? 'Memeriksa…' : 'Jalankan tes'}</button>
    {res && <div className="space-y-2 text-sm"><div className={`rounded-2xl p-3 font-bold ${res.ok ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{res.ok ? '✅ Server Key diterima Midtrans' : '❌ Ada masalah'}</div>
      <div className="grid grid-cols-2 gap-1 text-xs"><span className="text-slate-500">Mode terbaca</span><b>{res.mode}</b><span className="text-slate-500">Awalan key</span><b>{res.key_awalan}</b><span className="text-slate-500">Panjang key</span><b>{res.key_panjang}</b><span className="text-slate-500">Isi MIDTRANS_PROD</span><b>{res.nilai_prod || '(kosong)'}</b></div>
      {res.masalah?.map((x, i) => <p key={i} className="text-rose-600">• {x}</p>)}{res.pesan && <p className="text-xs text-slate-500">Balasan Midtrans: {res.pesan}</p>}</div>}</div>
}
