import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { rp, tgl } from '../lib/utils'
function Count({ to, uang }) {
  const [v, setV] = useState(0)
  useEffect(() => { if (to == null) return; let raf, t0; const step = t => { t0 ??= t; const p = Math.min((t - t0) / 900, 1); setV(to * (1 - Math.pow(1 - p, 3))); if (p < 1) raf = requestAnimationFrame(step) }; raf = requestAnimationFrame(step); return () => cancelAnimationFrame(raf) }, [to])
  return to == null ? <span className="skel inline-block w-24 h-7 align-middle" /> : <>{uang ? rp(v) : Math.round(v)}</>
}
export default function Dashboard() {
  const { profile } = useAuth(), r = profile.role, [d, setD] = useState({ merah: [], chart: [] }), [tugas, setTugas] = useState([])
  useEffect(() => { (async () => {
    const hari = new Date().toISOString().slice(0, 10)
    const pmq = supabase.from('pembayaran').select('jumlah').eq('status', 'sukses'); if (r !== 'nasabah') pmq.gte('created_at', hari)
    const [n, pj, tg, pm, tm] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'nasabah').eq('status', 'approved'),
      supabase.from('pinjaman').select('pokok,created_at,status'),
      supabase.from('angsuran').select('jumlah,denda').eq('status', 'belum').lt('jatuh_tempo', hari),
      pmq, supabase.from('tanggal_merah').select('*').order('tanggal')])
    const bln = {}, sum = (a, f) => (a || []).reduce((x, y) => x + Number(f(y)), 0)
    ;(pj.data || []).forEach(p => { const k = p.created_at.slice(0, 7); bln[k] = (bln[k] || 0) + Number(p.pokok) })
    setD({ nasabah: n.count, aktif: sum((pj.data || []).filter(p => p.status === 'aktif'), p => p.pokok), tunggak: sum(tg.data, x => +x.jumlah + +x.denda), masuk: sum(pm.data, x => x.jumlah), merah: tm.data || [], chart: Object.entries(bln).map(([bulan, total]) => ({ bulan, total })) })
    if (r === 'penagih') { const { data } = await supabase.from('tugas_tagih').select('*, angsuran(jumlah,denda,jatuh_tempo,nasabah:profiles!angsuran_nasabah_id_fkey(nama,no_hp))').neq('status', 'selesai'); setTugas(data || []) }
  })() }, [])
  const tiles = r === 'nasabah' ? [['💰', 'Pinjaman aktif', d.aktif, 1, 'from-violet-500 to-indigo-500'], ['⏰', 'Tunggakan', d.tunggak, 1, 'from-rose-500 to-orange-400'], ['✅', 'Sudah dibayar', d.masuk, 1, 'from-emerald-400 to-teal-500']]
    : [['👥', 'Nasabah', d.nasabah, 0, 'from-sky-500 to-indigo-500'], ['💰', 'Pinjaman aktif', d.aktif, 1, 'from-violet-500 to-fuchsia-500'], ['⏰', 'Tunggakan', d.tunggak, 1, 'from-rose-500 to-orange-400'], ['📈', 'Masuk hari ini', d.masuk, 1, 'from-emerald-400 to-teal-500']]
  return <div className="space-y-4">
    <div><p className="text-sm text-slate-500">{tgl(new Date())}</p><h1 className="text-3xl font-extrabold tracking-tight">Halo, {(profile.nama || '').split(' ')[0]} 👋</h1></div>
    {r === 'penagih' ? <div className="card"><h2 className="font-bold mb-2">🧾 Tugas penagihan ({tugas.length})</h2>
      {tugas.length === 0 ? <p className="text-sm text-slate-500">Belum ada tagihan terlambat yang ditugaskan. Santai dulu 😎</p> : tugas.map(t => <div key={t.id} className="flex justify-between py-2 border-t text-sm"><span>{t.angsuran?.nasabah?.nama}</span><b>{rp(+t.angsuran?.jumlah + +t.angsuran?.denda)}</b></div>)}</div>
    : <><div className="grid grid-cols-2 gap-3">{tiles.map(([ic, l, v, u, c], i) => <div key={l} className={`rounded-[28px] bg-gradient-to-br ${c} text-white p-4 shadow-lg ${tiles.length === 3 && i === 0 ? 'col-span-2' : ''}`}>
      <div className="text-2xl bg-white/25 w-11 h-11 rounded-2xl grid place-items-center">{ic}</div><div className="text-xs font-bold text-white/80 mt-3">{l}</div><div className="text-xl font-extrabold mt-0.5"><Count to={v} uang={!!u} /></div></div>)}</div>
      {r !== 'nasabah' && <div className="card h-64"><h2 className="font-bold mb-2">📊 Pinjaman per bulan</h2><ResponsiveContainer width="100%" height="88%"><BarChart data={d.chart}><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#6D5DFC" /><stop offset="1" stopColor="#E879F9" /></linearGradient></defs><XAxis dataKey="bulan" fontSize={11} axisLine={false} tickLine={false} /><Tooltip formatter={v => rp(v)} cursor={{ fill: 'rgba(109,93,252,.08)' }} /><Bar dataKey="total" fill="url(#g)" radius={[10, 10, 4, 4]} /></BarChart></ResponsiveContainer></div>}
      <div className="card"><h2 className="font-bold mb-2">🗓️ Tanggal merah</h2>{d.merah.length === 0 ? <p className="text-sm text-slate-500">Belum ada tanggal libur.</p> : d.merah.map(m => <div key={m.id} className="text-sm py-1"><b className="text-rose-500">{tgl(m.tanggal)}</b> · {m.keterangan}</div>)}</div></>}</div>
}
