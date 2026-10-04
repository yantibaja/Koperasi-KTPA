import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { useToast } from '../lib/toast'
import { rp, tgl } from '../lib/utils'
const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const jatuhTempo = (i, satuan) => {
  const n = new Date(); if (satuan === 'hari') return ymd(new Date(n.getFullYear(), n.getMonth(), n.getDate() + i + 1))
  const t = new Date(n.getFullYear(), n.getMonth() + i + 1, 1), last = new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate(); t.setDate(Math.min(n.getDate(), last)); return ymd(t)
}
export default function Pinjaman() {
  const { profile } = useAuth(), toast = useToast(), admin = profile.role !== 'nasabah'
  const [rows, setRows] = useState([]), [nas, setNas] = useState([]), [tabel, setTabel] = useState([]), [f, setF] = useState({ nasabah_id: '', satuan: 'hari', pokok: 0, tenor: 0 })
  const load = async () => {
    const { data } = await supabase.from('pinjaman').select('*, nasabah:profiles(nama), angsuran(*)').order('created_at', { ascending: false }); setRows(data || [])
    if (admin) { const { data: n } = await supabase.from('profiles').select('id,nama,koperasi_id').eq('role', 'nasabah').eq('status', 'approved'); setNas(n || []); const { data: t } = await supabase.from('tabel_angsuran').select('*'); setTabel(t || []) }
  }
  useEffect(() => { load() }, [])
  const kid = nas.find(n => n.id === f.nasabah_id)?.koperasi_id || profile.koperasi_id
  const T = tabel.filter(t => t.koperasi_id === kid && t.jenis === f.satuan), uniq = a => [...new Set(a)].sort((x, y) => x - y)
  const pokoks = uniq(T.map(t => +t.pokok)), tenors = uniq(T.filter(t => +t.pokok === f.pokok).map(t => t.tenor))
  const cicilan = +T.find(t => +t.pokok === f.pokok && t.tenor === f.tenor)?.cicilan || 0, total = cicilan * f.tenor
  const simpan = async () => {
    if (!f.nasabah_id) return toast.info('Pilih nasabah dulu'); if (!cicilan) return toast.info('Pilih pokok dan tenor')
    if (total < f.pokok) return toast.error('Tarif tidak wajar', 'Total bayar lebih kecil dari pokok. Perbaiki di Pengaturan → Tabel angsuran.')
    const { data: p, error } = await supabase.from('pinjaman').insert({ koperasi_id: kid, nasabah_id: f.nasabah_id, pokok: f.pokok, bunga_rp: Math.round(cicilan - f.pokok / f.tenor), bunga_persen: 0, tenor: f.tenor, satuan_tenor: f.satuan }).select().single()
    if (error) return toast.error('Gagal menyimpan', error.message)
    const { error: e2 } = await supabase.from('angsuran').insert(Array.from({ length: f.tenor }, (_, i) => ({ pinjaman_id: p.id, koperasi_id: kid, nasabah_id: f.nasabah_id, ke: i + 1, jumlah: cicilan, jatuh_tempo: jatuhTempo(i, f.satuan) })))
    if (e2) return toast.error('Angsuran gagal dibuat', e2.message)
    toast.success('Pinjaman tersimpan', `${f.tenor} angsuran ${f.satuan === 'hari' ? 'harian' : 'bulanan'} dibuat`); setF({ ...f, pokok: 0, tenor: 0 }); load()
  }
  const chip = (on, onClick, t) => <button key={t} onClick={onClick} className={`px-3 py-2 rounded-xl text-sm font-bold border ${on ? 'bg-brand text-white border-brand' : 'bg-white border-slate-200'}`}>{t}</button>
  return <div className="space-y-4"><h1 className="text-2xl font-extrabold">Pinjaman</h1>
    {admin && <div className="card space-y-3"><h2 className="font-bold">Pinjaman baru</h2>
      <select className="inp" value={f.nasabah_id} onChange={e => setF({ ...f, nasabah_id: e.target.value, pokok: 0, tenor: 0 })}><option value="">Pilih nasabah</option>{nas.map(n => <option key={n.id} value={n.id}>{n.nama}</option>)}</select>
      <div className="flex rounded-2xl bg-slate-100 p-1">{['hari', 'bulan'].map(s => <button key={s} onClick={() => setF({ ...f, satuan: s, pokok: 0, tenor: 0 })} className={`flex-1 py-2 rounded-xl text-sm font-bold ${f.satuan === s ? 'bg-white shadow text-brand-dark' : 'text-slate-500'}`}>{s === 'hari' ? 'Angsuran Harian' : 'Angsuran Bulanan'}</button>)}</div>
      {pokoks.length === 0 && <p className="text-sm text-slate-500">Tabel angsuran belum ada. Buka Pengaturan → Tabel angsuran → Muat tabel standar.</p>}
      <div><label className="lbl">Jumlah pinjaman</label><div className="flex flex-wrap gap-2">{pokoks.map(p => chip(f.pokok === p, () => setF({ ...f, pokok: p, tenor: 0 }), rp(p)))}</div></div>
      {f.pokok > 0 && <div><label className="lbl">Tenor</label><div className="flex flex-wrap gap-2">{tenors.map(t => chip(f.tenor === t, () => setF({ ...f, tenor: t }), `${t} ${f.satuan}`))}</div></div>}
      {cicilan > 0 && <div className="bg-brand-soft rounded-2xl p-3 text-sm space-y-0.5"><div>Cicilan: <b>{rp(cicilan)}</b> per {f.satuan} × {f.tenor}</div><div>Total bayar: <b>{rp(total)}</b> · Bunga: {rp(total - f.pokok)}</div></div>}
      <button className="btn" onClick={simpan}>Simpan pinjaman</button></div>}
    {rows.map(p => <div key={p.id} className="card"><div className="flex justify-between"><b>{p.nasabah?.nama}</b><b>{rp(p.pokok)}</b></div>
      <div className="text-xs text-slate-500 mb-2">Cicilan {rp(p.angsuran?.[0]?.jumlah)}/{p.satuan_tenor || 'bulan'} · {p.tenor} {p.satuan_tenor || 'bulan'} · {p.status}</div>
      {admin && <button className="text-red-600 text-xs mb-1" onClick={async () => { if (confirm('Hapus pinjaman ini?')) { await supabase.from('pinjaman').delete().eq('id', p.id); toast.info('Pinjaman dihapus'); load() } }}>Hapus pinjaman</button>}
      {p.angsuran?.sort((a, b) => a.ke - b.ke).map(a => <div key={a.id} className="flex justify-between text-sm py-1 border-t"><span>#{a.ke} · {tgl(a.jatuh_tempo)}</span><span className={a.status === 'lunas' ? 'text-brand' : ''}>{rp(+a.jumlah + +a.denda)} {a.status === 'lunas' ? '✓' : ''}</span></div>)}</div>)}</div>
}
