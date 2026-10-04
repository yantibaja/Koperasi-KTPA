import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { useToast } from '../lib/toast'
import Foto from '../lib/Foto'
const R = ({ l, v }) => v ? <div className="text-xs"><span className="text-slate-400">{l}: </span>{v}</div> : null
export default function Approval() {
  const { profile } = useAuth(), toast = useToast(), [rows, setRows] = useState([]), [kops, setKops] = useState([])
  const load = async () => {
    const { data } = await supabase.from('profiles').select('*, nasabah_detail(*), penagih_detail(*)').eq('status', 'pending').in('role', ['nasabah', 'penagih']); setRows(data || [])
    if (profile.role === 'super_admin') { const { data: k } = await supabase.from('koperasi').select('*').eq('status', 'pending'); setKops(k || []) }
  }
  useEffect(() => { load() }, [])
  const set = async (id, status, tbl = 'profiles') => {
    const { error } = await supabase.from(tbl).update({ status }).eq('id', id); if (error) return toast.error('Gagal', error.message)
    if (tbl === 'koperasi') await supabase.from('profiles').update({ status }).eq('koperasi_id', id).eq('role', 'admin')
    status === 'approved' ? toast.success('Disetujui') : toast.info('Ditolak'); load()
  }
  const Btn = ({ id, tbl }) => <div className="flex gap-2 pt-1"><button className="btn" onClick={() => set(id, 'approved', tbl)}>Setujui</button><button className="btn2" onClick={() => set(id, 'rejected', tbl)}>Tolak</button></div>
  return <div className="space-y-4"><h1 className="text-2xl font-extrabold">Persetujuan</h1>
    {kops.map(k => <div key={k.id} className="card"><b>{k.nama}</b><R l="Pemilik" v={k.nama_pemilik} /><R l="NIK" v={k.nik_pemilik} /><R l="Alamat" v={k.alamat} /><Btn id={k.id} tbl="koperasi" /></div>)}
    {rows.map(p => { const n = p.role === 'nasabah', d = (n ? p.nasabah_detail : p.penagih_detail) || {}, a = d.alamat_detail || {}, x = d.pengalaman || {}, B = n ? 'ktp' : 'dokumen_penagih'
      return <div key={p.id} className="card space-y-2"><div className="flex justify-between"><b>{p.nama}</b><span className="text-xs bg-brand-soft text-brand-dark rounded-full px-2 py-1">{p.role}</span></div>
        <R l="NIK" v={p.nik} /><R l="Kontak" v={p.no_hp || 'email'} />
        {n ? <><R l="Alamat" v={[a.jalan, a.rt && `RT ${a.rt}`, a.rw && `RW ${a.rw}`, a.kelurahan, a.kecamatan, a.kota, a.provinsi, a.pos].filter(Boolean).join(', ')} /><R l="Punya usaha" v={d.punya_usaha ? 'Ya' : 'Tidak'} /></>
          : <><R l="Alamat" v={p.alamat} /><R l="Pengalaman" v={d.punya_pengalaman ? `${x.bidang} di ${x.dimana}, ${x.lama}` : 'Tidak ada'} /></>}
        <div className="flex gap-2 flex-wrap">{n ? <><Foto bucket="ktp" path={d.foto_ktp} l="KTP" /><Foto bucket="foto_usaha" path={d.foto_usaha} l="Usaha" /><Foto bucket="ktp" path={d.foto_muka} l="Muka/Selfie" /></>
          : <><Foto bucket={B} path={d.foto_ktp} l="KTP" /><Foto bucket={B} path={d.foto_4x6} l="Foto 4x6" /><Foto bucket={B} path={d.cv} l="CV" /><Foto bucket={B} path={d.ijazah} l="Ijazah" /></>}</div>
        <Btn id={p.id} /></div> })}
    {rows.length + kops.length === 0 && <p className="text-sm text-slate-500">Tidak ada pendaftaran yang menunggu.</p>}</div>
}
