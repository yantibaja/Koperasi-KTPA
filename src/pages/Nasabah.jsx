import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Foto from '../lib/Foto'
export default function Nasabah() {
  const [rows, setRows] = useState([]), [bl, setBl] = useState([]), [open, setOpen] = useState(null), [nb, setNb] = useState({ tipe: 'NIK', nilai: '' })
  const load = async () => {
    const { data } = await supabase.from('profiles').select('*, nasabah_detail(*)').eq('role', 'nasabah').eq('status', 'approved').order('nama'); setRows(data || [])
    const { data: b } = await supabase.from('blocked_list').select('*').order('tipe'); setBl(b || [])
  }
  useEffect(() => { load() }, [])
  const blokir = async (p) => {
    const b = !p.status_blokir
    await supabase.from('profiles').update({ status_blokir: b }).eq('id', p.id)
    if (b) await supabase.from('blocked_list').upsert([{ koperasi_id: p.koperasi_id, tipe: 'NIK', nilai: p.nik }, ...(p.no_hp ? [{ koperasi_id: p.koperasi_id, tipe: 'HP', nilai: p.no_hp }] : [])], { onConflict: 'tipe,nilai' })
    else await supabase.from('blocked_list').delete().or(`nilai.eq.${p.nik},nilai.eq.${p.no_hp || 'x'}`)
    load()
  }
  const edit = async (p) => {
    const nama = prompt('Nama', p.nama); if (nama === null) return
    const no_hp = prompt('No HP', p.no_hp || ''); if (no_hp === null) return
    const alamat = prompt('Alamat', p.alamat || ''); if (alamat === null) return
    await supabase.from('profiles').update({ nama, no_hp, alamat }).eq('id', p.id); load()
  }
  const tambahBlok = async () => { if (!nb.nilai) return; const { error } = await supabase.from('blocked_list').insert(nb); if (error) alert(error.message); setNb({ ...nb, nilai: '' }); load() }
  return <div className="space-y-4"><h1 className="text-2xl font-extrabold">Nasabah</h1>
    {rows.map(p => { const d = p.nasabah_detail || {}, a = d.alamat_detail || {}; return <div key={p.id} className="card space-y-2">
      <div className="flex items-center justify-between gap-3"><div><div className="font-bold">{p.nama}{p.status_blokir && <span className="text-red-600 text-xs"> · diblokir</span>}</div><div className="text-xs text-slate-500">NIK {p.nik} · {p.no_hp || '-'}</div></div>
        <div className="flex gap-2"><button className="btn2" onClick={() => setOpen(open === p.id ? null : p.id)}>Detail</button><button className="btn2" onClick={() => edit(p)}>Edit</button><button className={p.status_blokir ? 'btn' : 'btn2'} onClick={() => blokir(p)}>{p.status_blokir ? 'Buka' : 'Blokir'}</button></div></div>
      {open === p.id && <div className="text-sm space-y-2 border-t pt-2"><div>{[a.jalan, a.rt && `RT ${a.rt}`, a.rw && `RW ${a.rw}`, a.kelurahan, a.kecamatan, a.kota, a.provinsi, a.pos].filter(Boolean).join(', ') || p.alamat}</div>
        <div>Usaha: {d.punya_usaha ? 'Ya' : 'Tidak'}</div><div className="flex gap-2 flex-wrap"><Foto bucket="ktp" path={d.foto_ktp} l="KTP" /><Foto bucket="foto_usaha" path={d.foto_usaha} l="Usaha" /><Foto bucket="ktp" path={d.foto_muka} l="Muka" /></div></div>}</div> })}
    {rows.length === 0 && <p className="text-sm text-slate-500">Belum ada nasabah. Bagikan kode koperasi dari menu Pengaturan agar nasabah mendaftar sendiri.</p>}
    <div className="card space-y-2"><h2 className="font-bold">Daftar blokir NIK & No HP</h2>
      <div className="flex gap-2"><select className="inp max-w-[6rem]" value={nb.tipe} onChange={e => setNb({ ...nb, tipe: e.target.value })}><option>NIK</option><option>HP</option></select><input className="inp" placeholder="Nilai" value={nb.nilai} onChange={e => setNb({ ...nb, nilai: e.target.value })} /><button className="btn" onClick={tambahBlok}>Blokir</button></div>
      {bl.map(x => <div key={x.id} className="flex justify-between text-sm"><span>{x.tipe}: {x.nilai}</span><button className="text-red-600" onClick={async () => { await supabase.from('blocked_list').delete().eq('id', x.id); load() }}>Hapus</button></div>)}</div></div>
}
