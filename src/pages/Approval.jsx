import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
const Foto = ({ bucket, path, l }) => { const [u, setU] = useState(); useEffect(() => { path && supabase.storage.from(bucket).createSignedUrl(path, 600).then(({ data }) => setU(data?.signedUrl)) }, [path])
  return u ? <a href={u} target="_blank"><img src={u} className="h-24 rounded-lg object-cover" title={l} /></a> : null }
export default function Approval() {
  const { profile } = useAuth(); const [rows, setRows] = useState([]), [kops, setKops] = useState([])
  const load = async () => {
    const { data } = await supabase.from('profiles').select('*, nasabah_detail(*), penagih_detail(*)').eq('status', 'pending').in('role', ['nasabah', 'penagih']); setRows(data || [])
    if (profile.role === 'super_admin') { const { data: k } = await supabase.from('koperasi').select('*').eq('status', 'pending'); setKops(k || []) }
  }
  useEffect(() => { load() }, [])
  const set = async (id, status, tbl = 'profiles') => { await supabase.from(tbl).update({ status }).eq('id', id)
    if (tbl === 'koperasi') await supabase.from('profiles').update({ status }).eq('koperasi_id', id).eq('role', 'admin'); load() }
  return <div className="space-y-4"><h1 className="text-2xl font-extrabold">Persetujuan</h1>
    {kops.map(k => <div key={k.id} className="card"><b>{k.nama}</b><div className="text-xs text-slate-500">{k.nama_pemilik} · NIK {k.nik_pemilik} · {k.alamat}</div>
      <div className="flex gap-2 mt-2"><button className="btn" onClick={() => set(k.id, 'approved', 'koperasi')}>Setujui</button><button className="btn2" onClick={() => set(k.id, 'rejected', 'koperasi')}>Tolak</button></div></div>)}
    {rows.map(p => { const d = p.nasabah_detail || p.penagih_detail || {}; return <div key={p.id} className="card space-y-2">
      <div className="flex justify-between"><b>{p.nama}</b><span className="text-xs bg-brand-soft text-brand-dark rounded-full px-2 py-1">{p.role}</span></div>
      <div className="text-xs text-slate-500">NIK {p.nik} · {p.no_hp || '-'}</div>
      <div className="flex gap-2 flex-wrap"><Foto bucket="ktp" path={d.foto_ktp} l="KTP" /><Foto bucket="foto_usaha" path={d.foto_usaha} l="Usaha" /><Foto bucket="ktp" path={d.foto_muka} l="Muka" /><Foto bucket="dokumen_penagih" path={d.foto_4x6} l="4x6" /></div>
      <div className="flex gap-2"><button className="btn" onClick={() => set(p.id, 'approved')}>Setujui</button><button className="btn2" onClick={() => set(p.id, 'rejected')}>Tolak</button></div></div> })}
    {rows.length + kops.length === 0 && <p className="text-sm text-slate-500">Tidak ada pendaftaran yang menunggu.</p>}</div>
}
