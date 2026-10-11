import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { useToast } from '../lib/toast'
import { fmtJam, AKSI } from '../lib/absen'
import { letters } from '../lib/utils'
import KameraAbsen from '../components/KameraAbsen'
import Foto from '../lib/Foto'
const ymd = (d = new Date()) => d.toLocaleDateString('en-CA')
const peta = (x) => `https://www.google.com/maps?q=${x.lat},${x.lng}`
const URUT = ['masuk', 'nasabah_baru', 'pinjaman_baru', 'istirahat', 'selesai_istirahat', 'pulang']
export default function Absensi() {
  const { profile } = useAuth(), toast = useToast(), r = profile.role, adm = r !== 'penagih', bisa = r !== 'super_admin'
  const [tgl, setTgl] = useState(ymd()), [rows, setRows] = useState(null), [orang, setOrang] = useState([]), [mine, setMine] = useState([]), [hariIni, setHariIni] = useState([]), [ask, setAsk] = useState(null), [nama, setNama] = useState(''), [buka, setBuka] = useState(null), [galat, setGalat] = useState(''), [gagal, setGagal] = useState('')
  const load = async () => {
    const mulai = new Date(`${tgl}T00:00:00`), akhir = new Date(mulai.getTime() + 864e5)
    const { data, error: e0 } = await supabase.from('absensi').select('*, p:profiles(nama,role)').gte('waktu', mulai.toISOString()).lt('waktu', akhir.toISOString()).order('waktu'); setRows(data || []); setGalat(e0 ? e0.message : '')
    if (adm) { const { data: o } = await supabase.from('profiles').select('id,nama,role').in('role', ['penagih', 'admin']).eq('status', 'approved'); setOrang(o || []) }
    if (bisa) {
      const d0 = new Date(); d0.setHours(0, 0, 0, 0)
      const { data: h, error: eh } = await supabase.from('absensi').select('*').eq('user_id', profile.id).gte('waktu', d0.toISOString()).order('waktu'); setGagal(eh ? eh.message : ''); setHariIni(h || [])
      const { data: m } = await supabase.from('absensi').select('*').eq('user_id', profile.id).order('waktu', { ascending: false }).limit(20); setMine(m || [])
    }
  }
  useEffect(() => { load() }, [tgl])
  const masuk = hariIni.find(x => x.tipe === 'masuk'), pulang = hariIni.find(x => x.tipe === 'pulang')
  const brk = hariIni.filter(x => x.tipe === 'istirahat' || x.tipe === 'selesai_istirahat'), jedaAktif = brk.length > 0 && brk[brk.length - 1].tipe === 'istirahat', aktif = !!masuk && !pulang
  const boleh = gagal ? { masuk: true, nasabah_baru: true, pinjaman_baru: true, istirahat: true, selesai_istirahat: true, pulang: true } : { masuk: !masuk, nasabah_baru: aktif, pinjaman_baru: aktif, istirahat: aktif && !jedaAktif, selesai_istirahat: aktif && jedaAktif, pulang: aktif && !jedaAktif }
  const alasan = (t) => t === 'masuk' ? 'Anda sudah absen masuk hari ini.' : !masuk ? 'Absen masuk dulu.' : pulang ? 'Anda sudah absen pulang hari ini.' : t === 'istirahat' ? 'Anda sedang istirahat. Tekan Selesai Istirahat.' : t === 'selesai_istirahat' ? 'Anda belum memulai istirahat.' : 'Selesai istirahat dulu sebelum pulang.'
  const jumlah = (t) => hariIni.filter(x => x.tipe === t).length
  const mulai = (t) => { if (AKSI[t].tanya) { setNama(''); setAsk(t) } else setBuka({ tipe: t }) }
  const lanjut = () => { if (nama.trim().length < 3) return toast.error('Isi nama dulu', 'Minimal 3 huruf'); setBuka({ tipe: ask, catatan: nama.trim() }); setAsk(null) }
  const Item = ({ x }) => <div className="flex gap-3 items-start border-t pt-2"><Foto bucket="absensi" path={x.foto_path} l={AKSI[x.tipe]?.pendek} />
    <div className="text-xs min-w-0"><b className="text-sm">{AKSI[x.tipe]?.ikon} {AKSI[x.tipe]?.label} · {fmtJam(new Date(x.waktu))}</b>{x.catatan && <div className="font-bold">👤 {x.catatan}</div>}<div className="text-slate-500 break-words">{x.alamat || 'Alamat tidak tersedia'}</div><a className="text-brand-dark font-bold" target="_blank" href={peta(x)}>Lihat peta ↗</a></div></div>
  return <div className="space-y-4"><h1 className="judul">Absensi</h1>
    {galat && <div className="card !bg-rose-50 text-sm text-rose-700"><b>Data absensi gagal dimuat.</b> {galat}<br />Pastikan patch_v14.sql dan patch_v15.sql sudah dijalankan di Supabase.</div>}
    {bisa && <div className="rounded-[28px] p-5 text-white shadow-xl bg-gradient-to-br from-brand to-fuchsia-500 space-y-3"><div className="text-xs font-bold text-white/80">Hari ini</div>
      <div className="grid grid-cols-3 gap-2 text-center">{[['Masuk', masuk ? fmtJam(new Date(masuk.waktu)) : '—'], ['Nasabah baru', jumlah('nasabah_baru')], ['Peminjam baru', jumlah('pinjaman_baru')]].map(([l, v]) => <div key={l} className="rounded-2xl bg-white/20 p-2"><div className="text-[10px]">{l}</div><div className="text-xl font-extrabold">{v}</div></div>)}</div>
      <div className="grid grid-cols-2 gap-2">{URUT.map(t => <button key={t} onClick={() => boleh[t] ? mulai(t) : toast.info('Belum bisa', alasan(t))} className={`rounded-2xl py-3 text-sm font-bold transition active:scale-95 ${boleh[t] ? 'bg-white text-brand-dark shadow-md' : 'bg-white/15 text-white/50'} ${t === 'pulang' ? 'col-span-2' : ''}`}>{AKSI[t].ikon} {AKSI[t].label}</button>)}</div>
      <p className="text-xs text-white/85">{!masuk ? 'Mulai dengan Absen Masuk.' : pulang ? `Sudah pulang ${fmtJam(new Date(pulang.waktu))}. Sampai besok 🙌` : jedaAktif ? 'Sedang istirahat. Tekan Selesai Istirahat saat kembali.' : 'Absen Nasabah/Peminjam Baru setiap kali mendapat yang baru.'}</p></div>}
    {gagal && <div className="card text-sm"><p className="text-rose-600 font-bold">Data absensi hari ini gagal dimuat.</p><p className="text-xs text-slate-500 break-words">{gagal}</p><p className="text-xs mt-1">Tombol tetap bisa dipakai. Pastikan patch_v14.sql dan patch_v15.sql sudah dijalankan.</p><button className="btn2 mt-2 !py-1.5" onClick={load}>Muat ulang</button></div>}
    {bisa && hariIni.length > 0 && <div className="card space-y-1"><h2 className="font-bold">🧭 Kegiatan hari ini</h2>{hariIni.map(x => <div key={x.id} className="flex justify-between text-sm py-1 border-t"><span>{AKSI[x.tipe]?.ikon} {AKSI[x.tipe]?.label}{x.catatan && <span className="text-slate-500"> · {x.catatan}</span>}</span><b>{fmtJam(new Date(x.waktu))}</b></div>)}</div>}
    {adm && <div className="card space-y-3"><div className="flex items-center justify-between gap-2"><h2 className="font-bold">👥 Kehadiran tim</h2><input type="date" className="inp !w-auto !py-2" value={tgl} onChange={e => setTgl(e.target.value)} /></div>
      {rows === null && <div className="skel h-16" />}
      {rows && orang.map(o => { const a = rows.filter(x => x.user_id === o.id), m = a.find(x => x.tipe === 'masuk'), p = a.find(x => x.tipe === 'pulang'), n1 = a.filter(x => x.tipe === 'nasabah_baru').length, n2 = a.filter(x => x.tipe === 'pinjaman_baru').length
        return <div key={o.id} className="space-y-2"><div className="flex items-center justify-between gap-2"><span><b>{o.nama}</b> <span className="text-[11px] text-slate-500">{o.role === 'admin' ? 'Pemilik' : 'Penagih'}</span></span>
          <span className={`text-xs font-bold rounded-full px-2 py-1 ${m ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{m ? `Masuk ${fmtJam(new Date(m.waktu))}${p ? ` · Pulang ${fmtJam(new Date(p.waktu))}` : ''}` : 'Belum absen'}</span></div>
          {a.length > 0 && <div className="text-[11px] text-slate-500">Nasabah baru: <b>{n1}</b> · Peminjam baru: <b>{n2}</b></div>}{a.map(x => <Item key={x.id} x={x} />)}</div> })}
      {rows && orang.length === 0 && <p className="text-sm text-slate-500">Belum ada penagih terdaftar.</p>}</div>}
    {bisa && <div className="card space-y-2"><h2 className="font-bold">🕘 Riwayat saya</h2>{mine.length === 0 && <p className="text-sm text-slate-500">Belum ada absensi.</p>}{mine.map(x => <Item key={x.id} x={x} />)}</div>}
    {ask && <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end md:items-center justify-center" onClick={() => setAsk(null)}><div className="sheet w-full max-w-md bg-white rounded-t-[32px] md:rounded-[32px] p-5 space-y-3" onClick={e => e.stopPropagation()}>
      <h2 className="text-lg font-extrabold">{AKSI[ask].ikon} {AKSI[ask].label}</h2><div><label className="lbl">{AKSI[ask].tanya}</label><input className="inp" autoFocus value={nama} onChange={e => setNama(letters(e.target.value).slice(0, 60))} placeholder="Nama sesuai KTP" /></div>
      <button className="btn w-full" onClick={lanjut}>📸 Lanjut buka kamera</button></div></div>}
    {buka && <KameraAbsen tipe={buka.tipe} catatan={buka.catatan} onSelesai={() => { setBuka(null); load() }} onBatal={() => setBuka(null)} />}</div>
}
