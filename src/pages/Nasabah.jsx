import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { useToast } from '../lib/toast'
import { useConfirm } from '../lib/confirm'
import Foto from '../lib/Foto'
import FormDaftar from '../components/FormDaftar'
export default function Nasabah() {
  const { koperasi } = useAuth(), toast = useToast(), ask = useConfirm()
  const [rows, setRows] = useState([]), [bl, setBl] = useState([]), [open, setOpen] = useState(null), [nb, setNb] = useState({ tipe: 'NIK', nilai: '' }), [tambah, setTambah] = useState(false)
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
    toast.info(b ? 'Nasabah diblokir' : 'Blokir dibuka'); load()
  }
  const edit = async (p) => {
    const nama = prompt('Nama', p.nama); if (nama === null) return
    const no_hp = prompt('No HP', p.no_hp || ''); if (no_hp === null) return
    const alamat = prompt('Alamat', p.alamat || ''); if (alamat === null) return
    const { error } = await supabase.from('profiles').update({ nama, no_hp, alamat }).eq('id', p.id); error ? toast.error('Gagal', error.message) : toast.success('Data diperbarui'); load()
  }
  const hapus = async (p) => {
    if (!await ask({ title: `Hapus ${p.nama}?`, text: 'Akun, data, foto, pinjaman, angsuran, dan riwayat pembayaran nasabah ini dihapus permanen. Tindakan ini tidak bisa dibatalkan.', ok: 'Hapus', danger: true })) return
    for (const b of ['ktp', 'foto_usaha']) { const { data } = await supabase.storage.from(b).list(p.id); if (data?.length) await supabase.storage.from(b).remove(data.map(x => `${p.id}/${x.name}`)) }
    const { error } = await supabase.rpc('hapus_nasabah', { p_id: p.id }); error ? toast.error('Gagal menghapus', error.message) : toast.success('Nasabah dihapus'); load()
  }
  const tambahBlok = async () => { if (!nb.nilai) return; const { error } = await supabase.from('blocked_list').insert(nb); error ? toast.error('Gagal', error.message) : toast.success('Ditambahkan ke daftar blokir'); setNb({ ...nb, nilai: '' }); load() }
  return <div className="space-y-4"><div className="flex items-center justify-between"><h1 className="text-2xl font-extrabold">Nasabah ({rows.length})</h1>{koperasi && <button className="btn" onClick={() => setTambah(!tambah)}>{tambah ? 'Tutup' : '+ Tambah'}</button>}</div>
    {tambah && <div className="card"><FormDaftar role="nasabah" kode={koperasi?.kode_unik} approveNow onDone={() => { toast.success('Nasabah ditambahkan'); setTambah(false); load() }} /></div>}
    {rows.map(p => { const d = p.nasabah_detail || {}, a = d.alamat_detail || {}; return <div key={p.id} className="card space-y-3">
      <div><div className="font-bold">{p.nama}{p.status_blokir && <span className="text-red-600 text-xs"> · diblokir</span>}</div><div className="text-xs text-slate-500 break-all">NIK {p.nik} · {p.no_hp || '-'}</div></div>
      <div className="flex flex-wrap gap-2"><button className="btn2 !py-2" onClick={() => setOpen(open === p.id ? null : p.id)}>Detail</button><button className="btn2 !py-2" onClick={() => edit(p)}>Edit</button>
        <button className="btn2 !py-2" onClick={() => blokir(p)}>{p.status_blokir ? 'Buka blokir' : 'Blokir'}</button><button className="btn2 !py-2 !text-rose-600" onClick={() => hapus(p)}>Hapus</button></div>
      {open === p.id && <div className="text-sm space-y-2 border-t pt-2"><div>{[a.jalan, a.rt && `RT ${a.rt}`, a.rw && `RW ${a.rw}`, a.kelurahan, a.kecamatan, a.kota, a.provinsi, a.pos].filter(Boolean).join(', ') || p.alamat}</div>
        <div>Usaha: {d.punya_usaha ? 'Ya' : 'Tidak'}</div><div className="flex gap-2 flex-wrap"><Foto bucket="ktp" path={d.foto_ktp} l="KTP" /><Foto bucket="foto_usaha" path={d.foto_usaha} l="Usaha" /><Foto bucket="ktp" path={d.foto_muka} l="Muka" /></div></div>}</div> })}
    {rows.length === 0 && <p className="text-sm text-slate-500">Belum ada nasabah. Bagikan kode koperasi dari menu Pengaturan agar nasabah mendaftar sendiri.</p>}
    <div className="card space-y-2"><h2 className="font-bold">Daftar blokir NIK & No HP</h2>
      <div className="flex gap-2"><select className="inp max-w-[6rem]" value={nb.tipe} onChange={e => setNb({ ...nb, tipe: e.target.value })}><option>NIK</option><option>HP</option></select><input className="inp" placeholder="Nilai" value={nb.nilai} onChange={e => setNb({ ...nb, nilai: e.target.value })} /><button className="btn" onClick={tambahBlok}>Blokir</button></div>
      {bl.map(x => <div key={x.id} className="flex justify-between text-sm"><span>{x.tipe}: {x.nilai}</span><button className="text-red-600" onClick={async () => { await supabase.from('blocked_list').delete().eq('id', x.id); load() }}>Hapus</button></div>)}</div></div>
}
