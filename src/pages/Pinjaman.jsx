import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { rp, tgl, simulasi } from '../lib/utils'
export default function Pinjaman() {
  const { profile } = useAuth(); const admin = profile.role !== 'nasabah'
  const [rows, setRows] = useState([]), [nas, setNas] = useState([]), [f, setF] = useState({ pokok: 1000000, bunga: 2, tenor: 6 })
  const load = async () => {
    const { data } = await supabase.from('pinjaman').select('*, nasabah:profiles(nama), angsuran(*)').order('created_at', { ascending: false }); setRows(data || [])
    if (admin) { const { data: n } = await supabase.from('profiles').select('id,nama').eq('role', 'nasabah').eq('status', 'approved'); setNas(n || []) }
  }
  useEffect(() => { load() }, [])
  const sim = simulasi(+f.pokok, +f.bunga, +f.tenor)
  const simpan = async () => {
    if (!f.nasabah_id) return alert('Pilih nasabah')
    const { data: p, error } = await supabase.from('pinjaman').insert({ koperasi_id: profile.koperasi_id, nasabah_id: f.nasabah_id, pokok: f.pokok, bunga_persen: f.bunga, tenor: f.tenor }).select().single()
    if (error) return alert(error.message)
    const now = new Date()
    await supabase.from('angsuran').insert(Array.from({ length: +f.tenor }, (_, i) => ({ pinjaman_id: p.id, koperasi_id: profile.koperasi_id, nasabah_id: f.nasabah_id, ke: i + 1, jumlah: sim.cicilan, jatuh_tempo: new Date(now.getFullYear(), now.getMonth() + i + 1, now.getDate()).toISOString().slice(0, 10) })))
    load()
  }
  return <div className="space-y-4"><h1 className="text-2xl font-extrabold">Pinjaman</h1>
    {admin && <div className="card space-y-3"><h2 className="font-bold">Pinjaman baru</h2>
      <select className="inp" onChange={e => setF({ ...f, nasabah_id: e.target.value })}><option value="">Pilih nasabah</option>{nas.map(n => <option key={n.id} value={n.id}>{n.nama}</option>)}</select>
      <div className="grid grid-cols-3 gap-2">{[['pokok', 'Pokok (Rp)'], ['bunga', 'Bunga %/bln'], ['tenor', 'Tenor (bln)']].map(([k, l]) => <div key={k}><label className="lbl">{l}</label><input type="number" className="inp" value={f[k]} onChange={e => setF({ ...f, [k]: e.target.value })} /></div>)}</div>
      <div className="bg-brand-soft rounded-xl p-3 text-sm">Simulasi: <b>{rp(sim.cicilan)}</b> × {f.tenor} bulan · total {rp(sim.total)}</div>
      <button className="btn" onClick={simpan}>Simpan pinjaman</button></div>}
    {rows.map(p => <div key={p.id} className="card"><div className="flex justify-between"><b>{p.nasabah?.nama}</b><b>{rp(p.pokok)}</b></div>
      <div className="text-xs text-slate-500 mb-2">Bunga {p.bunga_persen}% · {p.tenor} bulan · {p.status}</div>
      {p.angsuran?.sort((a, b) => a.ke - b.ke).map(a => <div key={a.id} className="flex justify-between text-sm py-1 border-t"><span>#{a.ke} · {tgl(a.jatuh_tempo)}</span><span className={a.status === 'lunas' ? 'text-brand' : ''}>{rp(+a.jumlah + +a.denda)} {a.status === 'lunas' ? '✓' : ''}</span></div>)}</div>)}</div>
}
