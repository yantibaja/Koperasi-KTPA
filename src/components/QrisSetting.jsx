import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { useToast } from '../lib/toast'
import Ikon from './Ikon'
import TesMidtrans from './TesMidtrans'
export default function QrisSetting() {
  const { profile, koperasi, setKoperasi } = useAuth(), toast = useToast(), kid = profile.koperasi_id
  const [url, setUrl] = useState(koperasi?.qris_url || ''), [mode, setMode] = useState(koperasi?.qris_mode || 'upload'), [busy, setBusy] = useState(false), [galat, setGalat] = useState('')
  useEffect(() => { supabase.from('koperasi').select('qris_url,qris_mode').eq('id', kid).maybeSingle().then(({ data, error }) => { if (error) setGalat(error.message); else if (data) { setUrl(data.qris_url || ''); setMode(data.qris_mode || 'upload') } }) }, [])
  const pilih = async (f) => {
    if (!f) return; if (f.size > 5e6) return toast.error('File terlalu besar', 'Maksimal 5 MB')
    setBusy(true)
    try {
      const path = `${kid}/qris-${Date.now()}.${(f.name.split('.').pop() || 'png').toLowerCase()}`
      const { error } = await supabase.storage.from('logo_koperasi').upload(path, f, { contentType: f.type }); if (error) throw error
      const u = supabase.storage.from('logo_koperasi').getPublicUrl(path).data.publicUrl
      const { error: e2 } = await supabase.from('koperasi').update({ qris_url: u }).eq('id', kid); if (e2) throw e2
      setUrl(u); setKoperasi?.({ ...koperasi, qris_url: u }); toast.success('QRIS tersimpan', 'Nasabah akan melihat QRIS ini saat memilih QRIS.')
    } catch (e) { toast.error('Gagal mengunggah QRIS', e.message) } finally { setBusy(false) }
  }
  const simpanMode = async (m) => { setMode(m); const { error } = await supabase.from('koperasi').update({ qris_mode: m }).eq('id', kid); error ? toast.error('Gagal', error.message) : toast.success(m === 'upload' ? 'QRIS unggahan aktif' : 'Midtrans dicoba dulu, QRIS unggahan sebagai cadangan'); setKoperasi?.({ ...koperasi, qris_mode: m }) }
  return <><div className="card space-y-3"><div className="flex items-center justify-between"><h2 className="font-bold">QRIS koperasi</h2><span className="text-[11px] bg-amber-100 text-amber-700 rounded-full px-2 py-1 font-bold">Hanya pemilik</span></div>
    <p className="text-xs text-slate-500">Unggah gambar QRIS koperasi. Saat nasabah memilih QRIS, gambar ini yang tampil, lalu mereka mengunggah bukti pembayaran untuk Anda verifikasi.</p>
    {galat && <p className="text-xs text-rose-600">{galat} · Jalankan patch_v16.sql di Supabase.</p>}
    <label className={`block rounded-2xl border-2 border-dashed p-4 text-center cursor-pointer transition ${url ? 'border-brand bg-brand-soft' : 'border-slate-300'}`}>
      {url ? <img src={url} className="mx-auto max-h-64 rounded-xl bg-white p-2" /> : <><Ikon n="upload" size={30} className="mx-auto text-slate-400" /><div className="text-sm font-bold mt-1">Unggah gambar QRIS</div><div className="text-xs text-slate-500">PNG atau JPG, maks 5 MB</div></>}
      <input type="file" accept="image/*" hidden disabled={busy} onChange={e => pilih(e.target.files[0])} /></label>
    {url && <p className="text-xs text-slate-500 text-center">{busy ? 'Mengunggah…' : 'Ketuk gambar untuk mengganti'}</p>}
    <div><label className="lbl">Cara QRIS bekerja</label><div className="flex rounded-2xl bg-slate-100 p-1">{[['upload', 'QRIS unggahan'], ['midtrans', 'Midtrans + cadangan']].map(([k, l]) => <button key={k} onClick={() => simpanMode(k)} className={`flex-1 py-2 rounded-xl text-xs font-bold ${mode === k ? 'bg-white shadow text-brand-dark' : 'text-slate-500'}`}>{l}</button>)}</div>
      <p className="text-[11px] text-slate-500 mt-1">{mode === 'upload' ? 'Selalu memakai QRIS unggahan (disarankan).' : 'Mencoba QR otomatis Midtrans; jika gagal, otomatis memakai QRIS unggahan.'}</p></div></div>
    {mode === 'midtrans' && <TesMidtrans />}</>
}
