import { useEffect, useState } from 'react'
import { supabase, upload } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import TabelAngsuran from '../components/TabelAngsuran'
import BiayaAdmin from '../components/BiayaAdmin'
import { useToast } from '../lib/toast'
export default function Pengaturan() {
  const { profile, koperasi, setKoperasi } = useAuth(); const kid = profile.koperasi_id, toast = useToast()
  const [k, setK] = useState(koperasi || {}), [denda, setDenda] = useState(0.5), [banks, setBanks] = useState([]), [libur, setLibur] = useState([]), [b, setB] = useState({}), [l, setL] = useState({})
  const load = async () => {
    if (!kid) return
    const [d, bk, tm] = await Promise.all([supabase.from('settings_denda').select('*').eq('koperasi_id', kid).maybeSingle(), supabase.from('bank_accounts').select('*').eq('koperasi_id', kid), supabase.from('tanggal_merah').select('*').eq('koperasi_id', kid).order('tanggal')])
    if (d.data) setDenda(d.data.persen_per_hari); setBanks(bk.data || []); setLibur(tm.data || [])
  }
  useEffect(() => { load() }, [])
  if (!kid) return <p className="text-sm text-slate-500">Super Admin: kelola koperasi lewat menu Persetujuan. Pengaturan ini milik tiap koperasi.</p>
  const saveK = async () => { const { data } = await supabase.from('koperasi').update({ nama: k.nama, alamat: k.alamat, telp: k.telp, sosmed: k.sosmed, logo_url: k.logo_url }).eq('id', kid).select().single(); setKoperasi(data); toast.success('Tersimpan') }
  const logo = async (f) => { const p = await upload('logo_koperasi', f, kid); setK({ ...k, logo_url: supabase.storage.from('logo_koperasi').getPublicUrl(p).data.publicUrl }) }
  return <div className="space-y-4"><h1 className="judul">Pengaturan</h1>
    <div className="card bg-brand-soft"><div className="text-xs font-bold text-slate-500">Kode koperasi (bagikan ke nasabah & penagih)</div><div className="text-2xl font-extrabold tracking-widest">{koperasi?.kode_unik}</div><div className="text-xs">Status: {koperasi?.status}</div></div>
    <div className="card space-y-2"><h2 className="font-bold">Data koperasi</h2>
      {[['nama', 'Nama'], ['alamat', 'Alamat'], ['telp', 'Telepon'], ['sosmed', 'Media sosial']].map(([x, lb]) => <div key={x}><label className="lbl">{lb}</label><input className="inp" value={k[x] || ''} onChange={e => setK({ ...k, [x]: e.target.value })} /></div>)}
      <input type="file" accept="image/*" onChange={e => logo(e.target.files[0])} /><br /><button className="btn" onClick={saveK}>Simpan</button></div>
    <div className="card space-y-2"><h2 className="font-bold">Denda keterlambatan</h2><label className="lbl">% per hari</label>
      <input type="number" step="0.1" className="inp" value={denda} onChange={e => setDenda(e.target.value)} />
      <button className="btn" onClick={async () => { await supabase.from('settings_denda').upsert({ koperasi_id: kid, persen_per_hari: denda }); toast.success('Tersimpan') }}>Simpan</button></div>
    <div className="card space-y-2"><h2 className="font-bold">Rekening bank</h2>
      {banks.map(x => <div key={x.id} className="flex justify-between text-sm"><span>{x.nama_bank} {x.no_rekening} a.n. {x.nama_pemilik}</span><button className="text-red-600" onClick={async () => { await supabase.from('bank_accounts').delete().eq('id', x.id); load() }}>Hapus</button></div>)}
      {[['nama_bank', 'Nama bank'], ['no_rekening', 'No rekening'], ['nama_pemilik', 'Nama pemilik']].map(([x, lb]) => <input key={x} className="inp" placeholder={lb} value={b[x] || ''} onChange={e => setB({ ...b, [x]: e.target.value })} />)}
      <button className="btn" onClick={async () => { await supabase.from('bank_accounts').insert({ ...b, koperasi_id: kid }); setB({}); load() }}>Tambah rekening</button></div>
    <div className="card space-y-2"><h2 className="font-bold">Tanggal merah / libur</h2>
      {libur.map(x => <div key={x.id} className="flex justify-between text-sm"><span>{x.tanggal} — {x.keterangan}</span><button className="text-red-600" onClick={async () => { await supabase.from('tanggal_merah').delete().eq('id', x.id); load() }}>Hapus</button></div>)}
      <input type="date" className="inp" value={l.tanggal || ''} onChange={e => setL({ ...l, tanggal: e.target.value })} /><input className="inp" placeholder="Keterangan" value={l.keterangan || ''} onChange={e => setL({ ...l, keterangan: e.target.value })} />
      <button className="btn" onClick={async () => { await supabase.from('tanggal_merah').insert({ ...l, koperasi_id: kid }); setL({}); load() }}>Tambah libur</button></div>
    <BiayaAdmin />
    <TabelAngsuran />
    <div className="card"><h2 className="font-bold mb-1">Metode pembayaran aktif</h2><p className="text-sm text-slate-500">CASH, TRANSFER, dan QRIS aktif. Nasabah hanya melihat TRANSFER & QRIS; penagih hanya CASH & TRANSFER.</p></div></div>
}
