import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useToast } from '../lib/toast'
export default function TesMidtrans() {
  const toast = useToast(), [busy, setBusy] = useState(false), [res, setRes] = useState(null)
  const tes = async (uji) => {
    setBusy(true); setRes(null)
    const { data, error } = await supabase.functions.invoke('midtrans-cek', { body: { uji_qris: uji } })
    if (error || data?.error) {
      let msg = data?.error || error.message
      if (error?.context?.json) { const b = await error.context.json().catch(() => null); if (b?.error) msg = b.error }
      if (error?.name === 'FunctionsFetchError') msg = 'Function midtrans-cek belum di-deploy (namanya harus persis midtrans-cek).'
      toast.error('Tes gagal', msg)
    } else setRes(data)
    setBusy(false)
  }
  const belumAktif = res?.qris?.hasil?.some(h => /not activated|not active/i.test(h.pesan))
  return <div className="card space-y-3"><div className="flex items-center justify-between"><h2 className="font-bold">🔌 Tes koneksi Midtrans</h2><span className="text-[11px] bg-amber-100 text-amber-700 rounded-full px-2 py-1 font-bold">Hanya pemilik</span></div>
    <p className="text-xs text-slate-500">Tes 1 memeriksa Server Key dan mode. Tes 2 mencoba membuat QRIS uji Rp10.000 (tidak dibayar, kedaluwarsa sendiri).</p>
    <div className="grid grid-cols-2 gap-2"><button className="btn2" disabled={busy} onClick={() => tes(false)}>1. Tes key</button><button className="btn" disabled={busy} onClick={() => tes(true)}>2. Tes QRIS</button></div>
    {busy && <p className="text-xs text-slate-500">Memeriksa…</p>}
    {res && <div className="space-y-2 text-sm"><div className={`rounded-2xl p-3 font-bold ${res.ok ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{res.ok ? '✅ Server Key diterima Midtrans' : '❌ Ada masalah pada key'}</div>
      <div className="grid grid-cols-2 gap-1 text-xs"><span className="text-slate-500">Mode terbaca</span><b>{res.mode}</b><span className="text-slate-500">Awalan key</span><b>{res.key_awalan}</b><span className="text-slate-500">Panjang key</span><b>{res.key_panjang}</b><span className="text-slate-500">Isi MIDTRANS_PROD</span><b>{res.nilai_prod || '(kosong)'}</b><span className="text-slate-500">Acquirer QRIS</span><b>{res.acquirer}</b></div>
      {res.qris && <p className={res.qris.ok ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>{res.qris.ok ? '✅ ' : '❌ QRIS: '}{res.qris.pesan}</p>}
      {res.qris_dilewati && <p className="text-xs text-slate-500">Mode produksi: tes pembuatan QR dilewati agar tidak membuat transaksi sungguhan.</p>}
      {res.masalah?.map((x, i) => <p key={i} className="text-rose-600">• {x}</p>)}{res.pesan && <p className="text-xs text-slate-500">Balasan Midtrans: {res.pesan}</p>}
      {res.qris && <div className="space-y-1"><div className={`rounded-2xl p-3 font-bold ${res.qris.ok ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{res.qris.ok ? '✅ QRIS aktif dan bisa dibuat' : '❌ QRIS belum bisa dibuat'}</div>
        {res.qris.hasil.map(h => <p key={h.acquirer} className="text-xs"><b>{h.acquirer}</b>: {h.kode} · {h.pesan}</p>)}
        {belumAktif && <p className="text-xs text-rose-600">Saluran QRIS belum diaktifkan untuk akun Midtrans pada mode {res.mode}. {res.mode === 'SANDBOX' ? 'Aktifkan QRIS di dashboard Midtrans (Sandbox) → Settings → Payment.' : 'Mode Produksi baru aktif setelah akun disetujui Midtrans. Untuk sekarang gunakan key Sandbox atau metode transfer.'}</p>}</div>}</div>}</div>
}
