import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { rp, tgl } from '../lib/utils'
export default function Dashboard() {
  const { profile } = useAuth(); const [d, setD] = useState({ merah: [], chart: [] }), [tugas, setTugas] = useState([])
  useEffect(() => { (async () => {
    const hari = new Date().toISOString().slice(0, 10)
    const [n, pj, tg, pm, tm] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'nasabah').eq('status', 'approved'),
      supabase.from('pinjaman').select('pokok,created_at,status'),
      supabase.from('angsuran').select('jumlah,denda').eq('status', 'belum').lt('jatuh_tempo', hari),
      supabase.from('pembayaran').select('jumlah').eq('status', 'sukses').gte('created_at', hari),
      supabase.from('tanggal_merah').select('*').order('tanggal')])
    const aktif = (pj.data || []).filter(p => p.status === 'aktif'), bln = {}
    ;(pj.data || []).forEach(p => { const k = p.created_at.slice(0, 7); bln[k] = (bln[k] || 0) + Number(p.pokok) })
    setD({ nasabah: n.count, aktif: aktif.reduce((a, b) => a + Number(b.pokok), 0), tunggak: (tg.data || []).reduce((a, b) => a + Number(b.jumlah) + Number(b.denda), 0),
      masuk: (pm.data || []).reduce((a, b) => a + Number(b.jumlah), 0), merah: tm.data || [], chart: Object.entries(bln).map(([bulan, total]) => ({ bulan, total })) })
    if (profile.role === 'penagih') { const { data } = await supabase.from('tugas_tagih').select('*, angsuran(jumlah,denda,jatuh_tempo,nasabah:profiles!angsuran_nasabah_id_fkey(nama,no_hp))').neq('status', 'selesai'); setTugas(data || []) }
  })() }, [])
  const K = ({ l, v }) => <div className="card"><div className="text-xs text-slate-500 font-bold">{l}</div><div className="text-xl font-extrabold mt-1">{v}</div></div>
  return <div className="space-y-4"><h1 className="text-2xl font-extrabold">Dashboard</h1>
    {profile.role === 'penagih' && <div className="card"><h2 className="font-bold mb-2">Tugas penagihan ({tugas.length})</h2>
      {tugas.length === 0 ? <p className="text-sm text-slate-500">Belum ada tagihan terlambat yang ditugaskan.</p> : tugas.map(t => <div key={t.id} className="flex justify-between py-2 border-t text-sm"><span>{t.angsuran?.nasabah?.nama}</span><b>{rp(+t.angsuran?.jumlah + +t.angsuran?.denda)}</b></div>)}</div>}
    {profile.role !== 'penagih' && <><div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <K l="Total nasabah" v={d.nasabah ?? '…'} /><K l="Pinjaman aktif" v={rp(d.aktif)} /><K l="Total tunggakan" v={rp(d.tunggak)} /><K l="Pemasukan hari ini" v={rp(d.masuk)} /></div>
      <div className="card h-64"><h2 className="font-bold mb-2">Pinjaman per bulan</h2><ResponsiveContainer width="100%" height="90%"><BarChart data={d.chart}><XAxis dataKey="bulan" fontSize={11} /><Tooltip formatter={v => rp(v)} /><Bar dataKey="total" fill="#0E9F8E" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div>
      <div className="card"><h2 className="font-bold mb-2">Tanggal merah</h2>{d.merah.length === 0 ? <p className="text-sm text-slate-500">Belum ada tanggal libur.</p> : d.merah.map(m => <div key={m.id} className="text-sm py-1"><b className="text-red-600">{tgl(m.tanggal)}</b> — {m.keterangan}</div>)}</div></>}
  </div>
}
