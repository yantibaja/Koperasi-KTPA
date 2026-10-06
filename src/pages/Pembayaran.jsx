import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { useToast } from '../lib/toast'
import { rp, tgl, compress } from '../lib/utils'
import Foto from '../lib/Foto'
const MET = { QRIS: ['📱', 'QRIS', 'Scan & bayar, otomatis lunas'], TRANSFER: ['🏦', 'Transfer', 'Upload bukti transfer'], CASH: ['💵', 'Tunai', 'Bayar langsung'] }
export default function Pembayaran() {
  const { profile } = useAuth(), toast = useToast(), r = profile.role, adm = r === 'admin' || r === 'super_admin'
  const metode = r === 'nasabah' ? ['QRIS', 'TRANSFER'] : r === 'penagih' ? ['CASH', 'TRANSFER'] : ['QRIS', 'TRANSFER', 'CASH']
  const [tag, setTag] = useState(null), [banks, setBanks] = useState([]), [ver, setVer] = useState([]), [sel, setSel] = useState(null), [m, setM] = useState(null), [bank, setBank] = useState(''), [file, setFile] = useState(null), [prev, setPrev] = useState(''), [qr, setQr] = useState(null), [busy, setBusy] = useState(false), [all, setAll] = useState(false), [q, setQ] = useState('')
  const load = async () => {
    const { data } = await supabase.from('angsuran').select('*, nasabah:profiles!angsuran_nasabah_id_fkey(nama)').eq('status', 'belum').order('jatuh_tempo'); setTag(data || [])
    const { data: b } = await supabase.from('bank_accounts').select('*'); setBanks(b || [])
    if (adm) { const { data: v } = await supabase.from('pembayaran').select('*, nasabah:profiles!pembayaran_nasabah_id_fkey(nama)').eq('status', 'menunggu_verifikasi'); setVer(v || []) }
  }
  useEffect(() => { load() }, [])
  const buka = (a) => { setSel(a); setM(null); setBank(''); setFile(null); setPrev(''); setQr(null) }
  const pilihFile = (f) => { if (f && f.size > 10e6) return toast.error('File terlalu besar', 'Maksimal 10 MB'); setFile(f || null); setPrev(f ? URL.createObjectURL(f) : '') }
  const total = sel ? +sel.jumlah + +sel.denda : 0
  const bankNama = (id) => { const x = banks.find(b => b.id === id); return x ? `${x.nama_bank} ${x.no_rekening}` : '-' }
  const bayar = async () => {
    setBusy(true)
    try {
      if (m === 'QRIS') {
        const { data, error } = await supabase.functions.invoke('create-qris', { body: { angsuran_id: sel.id } })
        if (error || data?.error) {
          let msg = data?.error || error.message
          if (error?.context?.json) { const b = await error.context.json().catch(() => null); if (b?.error) msg = b.error }
          if (error?.name === 'FunctionsFetchError') msg = 'Function create-qris tidak terjangkau. Pastikan sudah di-deploy dengan nama persis create-qris.'
          if (/unknown merchant/i.test(msg)) msg = r === 'nasabah' ? 'QRIS sedang tidak tersedia. Silakan pakai transfer atau hubungi koperasi.' : 'Server Key Midtrans tidak dikenali. Periksa MIDTRANS_SERVER_KEY dan MIDTRANS_PROD di Supabase.'
          throw new Error(msg)
        }
        return setQr(data)
      }
      let path = null
      if (m === 'TRANSFER') {
        if (!bank) throw new Error('Pilih bank tujuan dulu'); if (!file) throw new Error('Upload bukti transfer dulu')
        const c = await compress(file); path = `${profile.id}/${sel.id}-${Date.now()}.${c.name.split('.').pop()}`
        const { error } = await supabase.storage.from('bukti_transfer').upload(path, c); if (error) throw error
      }
      if (r === 'penagih') { const { error } = await supabase.rpc('catat_bayar_penagih', { p_angsuran: sel.id, p_metode: m, p_bank: bank || null, p_bukti: path }); if (error) throw error }
      else if (r === 'nasabah') { const { error } = await supabase.from('pembayaran').insert({ angsuran_id: sel.id, koperasi_id: sel.koperasi_id, nasabah_id: sel.nasabah_id, metode: m, jumlah: total, bank_id: bank, bukti_url: path, status: 'menunggu_verifikasi' }); if (error) throw error }
      else {
        const { error } = await supabase.from('pembayaran').insert({ angsuran_id: sel.id, koperasi_id: sel.koperasi_id, nasabah_id: sel.nasabah_id, metode: m, jumlah: total, bank_id: bank || null, bukti_url: path, status: 'sukses', dibuat_oleh: profile.id }); if (error) throw error
        await supabase.from('angsuran').update({ status: 'lunas', dibayar_at: new Date().toISOString() }).eq('id', sel.id)
        await supabase.from('tugas_tagih').update({ status: 'selesai' }).eq('angsuran_id', sel.id)
      }
      toast.success(r === 'nasabah' ? 'Bukti terkirim 🎉' : 'Pembayaran dicatat ✅', r === 'nasabah' ? 'Admin akan memverifikasi pembayaran Anda.' : undefined); setSel(null); load()
    } catch (e) { toast.error('Gagal', e.message || 'Coba lagi') } finally { setBusy(false) }
  }
  const cek = async () => { const { data } = await supabase.from('angsuran').select('status').eq('id', sel.id).single(); if (data?.status === 'lunas') { toast.success('Pembayaran diterima 🎉'); setSel(null); load() } else toast.info('Belum terdeteksi', 'Tunggu beberapa detik lalu coba lagi.') }
  const verif = async (id, ok) => { const { error } = await supabase.rpc('verifikasi_pembayaran', { p_id: id, p_terima: ok }); error ? toast.error('Gagal', error.message) : toast.success(ok ? 'Pembayaran diterima' : 'Pembayaran ditolak'); load() }
  const hariIni = new Date().toLocaleDateString('en-CA'), list = (tag || []).filter(a => (a.nasabah?.nama || '').toLowerCase().includes(q.toLowerCase()))
  const item = (a, hero) => { const t = +a.jumlah + +a.denda, telat = a.jatuh_tempo < hariIni
    return <button key={a.id} onClick={() => buka(a)} className={hero ? 'w-full text-left rounded-[28px] p-5 text-white shadow-xl active:scale-[.98] transition bg-gradient-to-br from-brand to-fuchsia-500' : 'card w-full text-left flex items-center justify-between gap-3 active:scale-[.98] transition'}>
      {hero ? <><div className="text-xs font-bold text-white/80">Tagihan berikutnya</div><div className="text-3xl font-extrabold mt-1">{rp(t)}</div><div className="text-sm text-white/85">Angsuran #{a.ke} · {tgl(a.jatuh_tempo)}{telat && ' · Terlambat'}</div><div className="mt-3 inline-block rounded-full bg-white/25 px-4 py-1.5 text-sm font-bold">Bayar sekarang →</div></>
        : <><div className="min-w-0"><b className="block truncate">{r === 'nasabah' ? `Angsuran #${a.ke}` : a.nasabah?.nama}</b><div className="text-xs text-slate-500">{r !== 'nasabah' && `#${a.ke} · `}{tgl(a.jatuh_tempo)}{+a.denda > 0 && ` · denda ${rp(a.denda)}`}</div></div>
          <div className="text-right shrink-0"><b>{rp(t)}</b>{telat && <div className="text-[10px] font-bold text-rose-500">TERLAMBAT</div>}</div></>}</button> }
  const rest = r === 'nasabah' && list.length ? list.slice(1) : list, tampil = all ? rest : rest.slice(0, 5)
  return <div className="space-y-4"><h1 className="judul">Pembayaran</h1>
    {adm && ver.length > 0 && <div className="card space-y-3"><h2 className="font-bold">🔎 Verifikasi transfer ({ver.length})</h2>
      {ver.map(v => <div key={v.id} className="border-t pt-3 space-y-2"><div className="flex justify-between text-sm"><span><b>{v.nasabah?.nama}</b><br /><span className="text-slate-500">{bankNama(v.bank_id)}</span></span><b>{rp(v.jumlah)}</b></div>
        <div className="flex items-center gap-3"><Foto bucket="bukti_transfer" path={v.bukti_url} l="Bukti" /><div className="flex gap-2 flex-1 justify-end"><button className="btn !py-2" onClick={() => verif(v.id, true)}>Terima</button><button className="btn2 !py-2" onClick={() => verif(v.id, false)}>Tolak</button></div></div></div>)}</div>}
    {tag === null && [0, 1, 2].map(i => <div key={i} className="skel h-20" />)}
    {tag && tag.length === 0 && <div className="card text-center py-8"><div className="text-4xl">🎉</div><p className="font-bold mt-2">Tidak ada tagihan</p><p className="text-sm text-slate-500">Semua angsuran sudah lunas.</p></div>}
    {r !== 'nasabah' && tag?.length > 0 && <input className="inp" placeholder="🔍 Cari nama nasabah…" value={q} onChange={e => setQ(e.target.value)} />}
    {r === 'nasabah' && list[0] && item(list[0], true)}
    {tampil.length > 0 && r === 'nasabah' && <h2 className="font-bold text-sm text-slate-500 pt-1">Tagihan lainnya</h2>}
    {tampil.map(a => item(a))}
    {rest.length > 5 && <button className="btn2 w-full" onClick={() => setAll(!all)}>{all ? 'Tampilkan lebih sedikit' : `Lihat semua (${rest.length})`}</button>}
    {sel && <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end md:items-center justify-center" onClick={() => setSel(null)}>
      <div className="sheet w-full max-w-md max-h-[92dvh] overflow-y-auto bg-white rounded-t-[32px] md:rounded-[32px] p-5 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-start"><div><div className="text-xs text-slate-500">{sel.nasabah?.nama} · Angsuran #{sel.ke}</div><div className="text-3xl font-extrabold">{rp(total)}</div></div><button className="btn2 !py-1.5 !px-3" onClick={() => setSel(null)}>✕</button></div>
        <div><label className="lbl">Pilih cara bayar</label><div className={`grid gap-2 ${metode.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>{metode.map(k => <button key={k} onClick={() => { setM(k); setQr(null) }} className={`rounded-2xl border-2 p-3 text-center transition active:scale-95 ${m === k ? 'border-brand bg-brand-soft' : 'border-slate-200'}`}><div className="text-2xl">{MET[k][0]}</div><div className="font-bold text-sm">{MET[k][1]}</div><div className="text-[10px] text-slate-500 leading-tight">{MET[k][2]}</div></button>)}</div></div>
        {m === 'QRIS' && (qr ? <div className="text-center space-y-2">{qr.qr_url ? <img className="mx-auto w-56 rounded-2xl" src={qr.qr_url} /> : <QRCodeSVG className="mx-auto" value={qr.qr_string} size={224} />}<p className="text-xs text-slate-500">Scan dengan e-wallet atau mobile banking. Tagihan lunas otomatis setelah dibayar.</p><button className="btn w-full" onClick={cek}>Saya sudah bayar, cek status</button></div>
          : <button className="btn w-full" disabled={busy} onClick={bayar}>{busy ? 'Membuat QRIS…' : 'Buat QRIS'}</button>)}
        {m === 'TRANSFER' && <div className="space-y-3"><div><label className="lbl">Transfer ke rekening</label><div className="space-y-2">{banks.map(b => <div key={b.id} onClick={() => setBank(b.id)} className={`rounded-2xl border-2 p-3 flex items-center gap-3 cursor-pointer transition ${bank === b.id ? 'border-brand bg-brand-soft' : 'border-slate-200'}`}>
            <span className="text-2xl">🏦</span><div className="flex-1 min-w-0 text-sm"><b>{b.nama_bank}</b><div className="font-mono">{b.no_rekening}</div><div className="text-xs text-slate-500">a.n. {b.nama_pemilik}</div></div>
            <button className="btn2 !py-1.5 !px-3 text-xs" onClick={e => { e.stopPropagation(); navigator.clipboard?.writeText(b.no_rekening); toast.success('Nomor rekening disalin') }}>Salin</button></div>)}
            {banks.length === 0 && <p className="text-sm text-slate-500">Koperasi belum menambahkan rekening bank.</p>}</div></div>
          <div><label className="lbl">Bukti transfer (wajib)</label><label className={`block rounded-2xl border-2 border-dashed p-4 text-center cursor-pointer transition ${file ? 'border-brand bg-brand-soft' : 'border-slate-300'}`}>
            {prev ? <img src={prev} className="mx-auto max-h-48 rounded-xl" /> : <><div className="text-3xl">📸</div><div className="text-sm font-bold">Upload bukti transfer</div><div className="text-xs text-slate-500">Foto atau screenshot, maks 10 MB</div></>}
            <input type="file" accept="image/*" hidden onChange={e => pilihFile(e.target.files[0])} /></label>{file && <p className="text-xs text-slate-500 truncate mt-1">{file.name} · ketuk untuk mengganti</p>}</div>
          <button className="btn w-full" disabled={busy || !bank || !file} onClick={bayar}>{busy ? 'Mengirim…' : r === 'nasabah' ? 'Kirim bukti transfer' : 'Catat pembayaran'}</button>
          {r === 'nasabah' && <p className="text-xs text-slate-500 text-center">Admin akan memeriksa bukti Anda sebelum tagihan dinyatakan lunas.</p>}</div>}
        {m === 'CASH' && <button className="btn w-full" disabled={busy} onClick={bayar}>{busy ? 'Menyimpan…' : 'Catat pembayaran tunai'}</button>}
      </div></div>}</div>
}
