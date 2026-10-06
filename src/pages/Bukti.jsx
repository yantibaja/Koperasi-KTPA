import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { rp, tgl } from '../lib/utils'
const bg = import.meta.env.BASE_URL + 'bukti-bg.png'
const Y = { nama: 140, jumlah: 185, tenor: 224, petugas: 262, kec: 318 }
const CSS = `.kartu{position:relative;width:100%;aspect-ratio:1320/534;background-size:100% 100%;container-type:inline-size;break-inside:avoid;-webkit-print-color-adjust:exact;print-color-adjust:exact;border-radius:6px}
.isi{position:absolute;left:35.4%;width:50.8%;display:flex;align-items:flex-end;font-weight:700;font-size:2.3cqw;color:#0b1b6b;white-space:nowrap;overflow:hidden}
.tgl{position:absolute;left:70.8%;top:63.3%;width:22.2%;height:5.2%;background:#5EBBFF;display:flex;align-items:center;justify-content:flex-end;font-weight:800;font-size:1.75cqw;color:#000;white-space:nowrap}
@media print{@page{size:A4;margin:10mm}body *{visibility:hidden}.area,.area *{visibility:visible}.area{position:absolute;left:0;top:0;width:100%}.kartu{margin-bottom:6mm}}`
const Kartu = ({ d }) => <div className="kartu" style={{ backgroundImage: `url(${bg})` }}>
  {d && <>{Object.entries(Y).map(([k, y]) => <div key={k} className="isi" style={{ top: `${(y - 33) / 5.34}%`, height: `${30 / 5.34}%` }}>{d[k]}</div>)}<div className="tgl">{d.tanggal}</div></>}</div>
export default function Bukti() {
  const { profile } = useAuth(), admin = profile.role !== 'penagih', [sp] = useSearchParams()
  const [rows, setRows] = useState([]), [pen, setPen] = useState([]), [mode, setMode] = useState(admin ? 'isi' : 'kosong'), [pid, setPid] = useState(sp.get('id') || ''), [petugas, setPetugas] = useState(profile.nama || ''), [tempat, setTempat] = useState('Kupang'), [kec, setKec] = useState(''), [tanggal, setTanggal] = useState(new Date().toLocaleDateString('en-CA')), [salinan, setSalinan] = useState(1)
  useEffect(() => { if (!admin) return; (async () => {
    const { data } = await supabase.from('pinjaman').select('*, nasabah:profiles(nama, nasabah_detail(alamat_detail))').order('created_at', { ascending: false }); setRows(data || [])
    const { data: p } = await supabase.from('profiles').select('nama').eq('role', 'penagih').eq('status', 'approved'); setPen(p || []) })() }, [])
  const p = rows.find(r => r.id === pid)
  useEffect(() => { const nd = [].concat(p?.nasabah?.nasabah_detail || [])[0]; setKec(nd?.alamat_detail?.kecamatan || '') }, [pid, rows])
  const d = p && { nama: p.nasabah?.nama, jumlah: rp(p.pokok), tenor: `${p.tenor} ${p.satuan_tenor || 'bulan'}`, petugas, kec, tanggal: `${tempat}, ${tgl(tanggal)}` }
  return <div className="space-y-4"><style>{CSS}</style>
    <div className="space-y-3 print:hidden" style={{ }}><h1 className="judul">Bukti Penerimaan Pinjaman</h1>
      <div className="card space-y-3">
        {admin && <div className="flex rounded-2xl bg-slate-100 p-1">{[['isi', 'Terisi otomatis'], ['kosong', 'Kosong (tulis tangan)']].map(([k, l]) => <button key={k} onClick={() => setMode(k)} className={`flex-1 py-2 rounded-xl text-sm font-bold ${mode === k ? 'bg-white shadow text-brand-dark' : 'text-slate-500'}`}>{l}</button>)}</div>}
        {mode === 'isi' ? <>
          <select className="inp" value={pid} onChange={e => setPid(e.target.value)}><option value="">Pilih pinjaman</option>{rows.map(r => <option key={r.id} value={r.id}>{r.nasabah?.nama} · {rp(r.pokok)} · {r.tenor} {r.satuan_tenor || 'bulan'}</option>)}</select>
          <div><label className="lbl">Nama petugas</label><input className="inp" list="pen" value={petugas} onChange={e => setPetugas(e.target.value)} /><datalist id="pen">{pen.map(x => <option key={x.nama} value={x.nama} />)}</datalist></div>
          <div className="grid grid-cols-2 gap-2"><div><label className="lbl">Kecamatan</label><input className="inp" value={kec} onChange={e => setKec(e.target.value)} /></div><div><label className="lbl">Tempat</label><input className="inp" value={tempat} onChange={e => setTempat(e.target.value)} /></div></div>
          <div className="grid grid-cols-2 gap-2"><div><label className="lbl">Tanggal</label><input type="date" className="inp" value={tanggal} onChange={e => setTanggal(e.target.value)} /></div><div><label className="lbl">Jumlah salinan</label><select className="inp" value={salinan} onChange={e => setSalinan(+e.target.value)}>{[1, 2, 3].map(n => <option key={n}>{n}</option>)}</select></div></div>
        </> : <p className="text-sm text-slate-500">Mencetak 3 lembar kosong per halaman A4 untuk diisi tangan di lapangan.</p>}
        <button className="btn w-full" disabled={mode === 'isi' && !d} onClick={() => window.print()}>🖨️ Cetak / Simpan PDF</button></div></div>
    <div className="area space-y-3">{mode === 'isi' ? (d ? Array.from({ length: salinan }, (_, i) => <Kartu key={i} d={d} />) : <p className="text-sm text-slate-500 print:hidden">Pilih pinjaman untuk melihat pratinjau.</p>) : [0, 1, 2].map(i => <Kartu key={i} />)}</div></div>
}
