import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { rp, tgl } from '../lib/utils'
const ROLE = { super_admin: 'Super Admin', admin: 'Pemilik', penagih: 'Penagih', nasabah: 'Nasabah' }
const QUICK = {
  admin: [['/pinjaman', '💰', 'Pinjaman'], ['/pembayaran', '💳', 'Bayar'], ['/nasabah', '👥', 'Nasabah'], ['/absensi', '📸', 'Absensi'], ['/bukti', '🧾', 'Bukti'], ['/wa', '💬', 'Pesan WA'], ['/tim', '🧑‍💼', 'Tim'], ['/persetujuan', '✅', 'Setuju']],
  super_admin: [['/koperasi', '🏢', 'Koperasi'], ['/nasabah', '👥', 'Nasabah'], ['/pinjaman', '💰', 'Pinjaman'], ['/persetujuan', '✅', 'Setuju'], ['/pembayaran', '💳', 'Bayar'], ['/absensi', '📸', 'Absensi'], ['/wa', '💬', 'Pesan WA'], ['/bukti', '🧾', 'Bukti']],
  penagih: [['/pembayaran', '💳', 'Tagih'], ['/absensi', '📸', 'Absensi'], ['/tambah-nasabah', '➕', 'Nasabah'], ['/bukti', '🧾', 'Bukti']],
  nasabah: [['/pinjaman', '💰', 'Pinjaman'], ['/pembayaran', '💳', 'Bayar']],
}
function Count({ to, uang }) {
  const [v, setV] = useState(0)
  useEffect(() => { if (to == null) return; let raf, t0; const step = t => { t0 ??= t; const p = Math.min((t - t0) / 900, 1); setV(to * (1 - Math.pow(1 - p, 3))); if (p < 1) raf = requestAnimationFrame(step) }; raf = requestAnimationFrame(step); return () => cancelAnimationFrame(raf) }, [to])
  return to == null ? <span className="skel inline-block w-28 h-8 align-middle" /> : <>{uang ? rp(v) : Math.round(v)}</>
}
export default function Dashboard() {
  const { profile, koperasi } = useAuth(), r = profile.role, [d, setD] = useState({ merah: [], chart: [] }), [tugas, setTugas] = useState([])
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
  const tiles = r === 'nasabah' ? [['⏰', 'Tunggakan', d.tunggak, 1, 'from-rose-500 to-orange-400'], ['✅', 'Sudah dibayar', d.masuk, 1, 'from-emerald-400 to-teal-500']]
    : [['👥', 'Nasabah', d.nasabah, 0, 'from-sky-500 to-indigo-500'], ['⏰', 'Tunggakan', d.tunggak, 1, 'from-rose-500 to-orange-400'], ['📈', 'Masuk hari ini', d.masuk, 1, 'from-emerald-400 to-teal-500']]
  const hero = r === 'penagih' ? ['Tugas penagihan', tugas.length, 0] : ['Pinjaman aktif', d.aktif, 1]
  return <div className="space-y-5">
    <div className="relative overflow-hidden rounded-[32px] p-5 text-white shadow-xl bg-gradient-to-br from-brand via-violet-500 to-fuchsia-500">
      <div className="absolute -top-10 -right-8 w-40 h-40 rounded-full bg-white/15" /><div className="absolute -bottom-12 -left-6 w-36 h-36 rounded-full bg-white/10" />
      <div className="relative"><div className="flex items-center justify-between"><div><p className="text-xs text-white/75">{tgl(new Date())}</p><h1 className="text-2xl font-extrabold tracking-tight">Halo, {(profile.nama || '').split(' ')[0]} 👋</h1></div><span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold">{ROLE[r]}</span></div>
        <div className="mt-5 text-xs font-bold text-white/80">{hero[0]}</div><div className="text-3xl font-extrabold tracking-tight"><Count to={r === 'penagih' ? tugas.length : hero[1]} uang={!!hero[2]} /></div>
        <p className="text-xs text-white/70 mt-1 truncate">{koperasi?.nama}</p></div></div>
    <div className={`grid gap-3 ${QUICK[r].length > 4 ? 'grid-cols-4 md:grid-cols-8' : 'grid-cols-4'}`}>{QUICK[r].map(([to, ic, l]) => <Link key={to} to={to} className="flex flex-col items-center gap-1.5 active:scale-95 transition"><span className="w-14 h-14 rounded-[20px] grid place-items-center text-2xl bg-white/80 shadow-md border border-white/70">{ic}</span><span className="text-[11px] font-bold text-center">{l}</span></Link>)}</div>
    {r === 'penagih' ? <div className="card"><h2 className="font-bold mb-2">🧾 Tugas penagihan ({tugas.length})</h2>
      {tugas.length === 0 ? <p className="text-sm text-slate-500">Belum ada tagihan terlambat yang ditugaskan. Santai dulu 😎</p> : tugas.map(t => <div key={t.id} className="flex justify-between py-2 border-t text-sm"><span>{t.angsuran?.nasabah?.nama}</span><b>{rp(+t.angsuran?.jumlah + +t.angsuran?.denda)}</b></div>)}</div>
    : <><div className="grid grid-cols-2 gap-3">{tiles.map(([ic, l, v, u, c], i) => <div key={l} className={`rounded-[28px] bg-gradient-to-br ${c} text-white p-4 shadow-lg ${tiles.length === 3 && i === 0 ? 'col-span-2' : ''}`}>
      <div className="text-2xl bg-white/25 w-11 h-11 rounded-2xl grid place-items-center">{ic}</div><div className="text-xs font-bold text-white/80 mt-3">{l}</div><div className="text-xl font-extrabold mt-0.5"><Count to={v} uang={!!u} /></div></div>)}</div>
      {r !== 'nasabah' && <div className="card h-64"><h2 className="font-bold mb-2">📊 Pinjaman per bulan</h2><ResponsiveContainer width="100%" height="88%"><BarChart data={d.chart}><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#6D5DFC" /><stop offset="1" stopColor="#E879F9" /></linearGradient></defs><XAxis dataKey="bulan" fontSize={11} axisLine={false} tickLine={false} /><Tooltip formatter={v => rp(v)} cursor={{ fill: 'rgba(109,93,252,.08)' }} /><Bar dataKey="total" fill="url(#g)" radius={[10, 10, 4, 4]} /></BarChart></ResponsiveContainer></div>}
      <div className="card"><h2 className="font-bold mb-2">🗓️ Tanggal merah</h2>{d.merah.length === 0 ? <p className="text-sm text-slate-500">Belum ada tanggal libur.</p> : d.merah.map(m => <div key={m.id} className="text-sm py-1"><b className="text-rose-500">{tgl(m.tanggal)}</b> · {m.keterangan}</div>)}</div></>}</div>
}
