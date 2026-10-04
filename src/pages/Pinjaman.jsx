import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { useToast } from '../lib/toast'
import { rp, tgl, simulasi, digits } from '../lib/utils'
const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const jatuhTempo = (i, satuan) => {
  const n = new Date(); if (satuan === 'hari') return ymd(new Date(n.getFullYear(), n.getMonth(), n.getDate() + i + 1))
  const t = new Date(n.getFullYear(), n.getMonth() + i + 1, 1), last = new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate(); t.setDate(Math.min(n.getDate(), last)); return ymd(t)
}
export default function Pinjaman() {
  const { profile } = useAuth(), toast = useToast(), admin = profile.role !== 'nasabah'
  const [rows, setRows] = useState([]), [nas, setNas] = useState([]), [f, setF] = useState({ pokok: '1000000', bunga: '20000', tenor: '6', satuan: 'bulan', nasabah_id: '' })
  const load = async () => {
    const { data } = await supabase.from('pinjaman').select('*, nasabah:profiles(nama), angsuran(*)').order('created_at', { ascending: false }); setRows(data || [])
    if (admin) { const { data: n } = await supabase.from('profiles').select('id,nama,koperasi_id').eq('role', 'nasabah').eq('status', 'approved'); setNas(n || []) }
  }
  useEffect(() => { load() }, [])
  const pokok = +f.pokok || 0, bunga = +f.bunga || 0, tenor = +f.tenor || 0, sim = simulasi(pokok, bunga, tenor)
  const simpan = async () => {
    const kid = nas.find(n => n.id === f.nasabah_id)?.koperasi_id
    if (!f.nasabah_id) return toast.info('Pilih nasabah dulu'); if (pokok <= 0 || tenor <= 0) return toast.error('Isi pokok dan tenor dengan benar')
    const { data: p, error } = await supabase.from('pinjaman').insert({ koperasi_id: kid, nasabah_id: f.nasabah_id, pokok, bunga_rp: bunga, bunga_persen: 0, tenor, satuan_tenor: f.satuan }).select().single()
    if (error) return toast.error('Gagal menyimpan', error.message)
    const { error: e2 } = await supabase.from('angsuran').insert(Array.from({ length: tenor }, (_, i) => ({ pinjaman_id: p.id, koperasi_id: kid, nasabah_id: f.nasabah_id, ke: i + 1, jumlah: sim.cicilan, jatuh_tempo: jatuhTempo(i, f.satuan) })))
    if (e2) return toast.error('Angsuran gagal dibuat', e2.message)
    toast.success('Pinjaman tersimpan', `${tenor} angsuran ${f.satuan === 'hari' ? 'harian' : 'bulanan'} dibuat`); load()
  }
  const num = (k) => <input inputMode="numeric" className="inp" value={f[k]} onChange={e => setF({ ...f, [k]: digits(e.target.value, 12) })} />
  return <div className="space-y-4"><h1 className="text-2xl font-extrabold">Pinjaman</h1>
    {admin && <div className="card space-y-3"><h2 className="font-bold">Pinjaman baru</h2>
      <select className="inp" value={f.nasabah_id} onChange={e => setF({ ...f, nasabah_id: e.target.value })}><option value="">Pilih nasabah</option>{nas.map(n => <option key={n.id} value={n.id}>{n.nama}</option>)}</select>
      <div><label className="lbl">Pokok pinjaman (Rp)</label>{num('pokok')}</div>
      <div><label className="lbl">Tenor</label><div className="flex gap-2"><div className="flex-1">{num('tenor')}</div>
        <div className="flex rounded-2xl bg-slate-100 p-1">{['hari', 'bulan'].map(s => <button key={s} onClick={() => setF({ ...f, satuan: s })} className={`px-4 rounded-xl text-sm font-bold ${f.satuan === s ? 'bg-white shadow text-brand-dark' : 'text-slate-500'}`}>{s === 'hari' ? 'Harian' : 'Bulanan'}</button>)}</div></div></div>
      <div><label className="lbl">Bunga (Rp) per {f.satuan}</label>{num('bunga')}</div>
      <div className="bg-brand-soft rounded-2xl p-3 text-sm">Simulasi: <b>{rp(sim.cicilan)}</b> per {f.satuan} × {tenor} · total bayar {rp(sim.total)}</div>
      <button className="btn" onClick={simpan}>Simpan pinjaman</button></div>}
    {rows.map(p => <div key={p.id} className="card"><div className="flex justify-between"><b>{p.nasabah?.nama}</b><b>{rp(p.pokok)}</b></div>
      <div className="text-xs text-slate-500 mb-2">Bunga {rp(p.bunga_rp)}/{p.satuan_tenor || 'bulan'} · {p.tenor} {p.satuan_tenor || 'bulan'} · {p.status}</div>
      {admin && <button className="text-red-600 text-xs mb-1" onClick={async () => { if (confirm('Hapus pinjaman ini?')) { await supabase.from('pinjaman').delete().eq('id', p.id); toast.info('Pinjaman dihapus'); load() } }}>Hapus pinjaman</button>}
      {p.angsuran?.sort((a, b) => a.ke - b.ke).map(a => <div key={a.id} className="flex justify-between text-sm py-1 border-t"><span>#{a.ke} · {tgl(a.jatuh_tempo)}</span><span className={a.status === 'lunas' ? 'text-brand' : ''}>{rp(+a.jumlah + +a.denda)} {a.status === 'lunas' ? '✓' : ''}</span></div>)}</div>)}</div>
}
