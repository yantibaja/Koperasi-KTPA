import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { useToast } from '../lib/toast'
import { kodeFoto, ambilLokasi, alamatDari, buatPeta, gambarWM, fmtJam, fmtTanggal, fmtHari, AKSI } from '../lib/absen'
const pesanKamera = (e) => e?.name === 'NotAllowedError' ? 'Izin kamera ditolak. Ketuk ikon gembok di kolom alamat → Izin → aktifkan Kamera, lalu coba lagi.'
  : e?.name === 'NotFoundError' ? 'Kamera tidak ditemukan di perangkat ini.' : e?.name === 'NotReadableError' ? 'Kamera sedang dipakai aplikasi lain. Tutup aplikasi kamera lalu coba lagi.' : 'Kamera tidak bisa dibuka. Coba lagi atau buka lewat Chrome.'
export default function KameraAbsen({ tipe, catatan, onSelesai, onBatal }) {
  const { profile, koperasi } = useAuth(), toast = useToast()
  const vref = useRef(), cref = useRef(), dref = useRef(), logo = useRef(null), frame = useRef(false)
  const [facing, setFacing] = useState('user'), [errKam, setErrKam] = useState(''), [errLok, setErrLok] = useState(''), [loc, setLoc] = useState(null), [alamat, setAlamat] = useState(''), [peta, setPeta] = useState(null), [geo, setGeo] = useState(false), [tunggu, setTunggu] = useState(true), [kode, setKode] = useState(kodeFoto), [kamera, setKamera] = useState(false), [hasil, setHasil] = useState(null), [busy, setBusy] = useState(false), [ulang, setUlang] = useState(0)
  // 1. Lokasi: tombol potret tidak menunggu alamat/peta terlalu lama
  useEffect(() => {
    let mati = false; setErrLok(''); setLoc(null); setGeo(false); setTunggu(true); setAlamat(''); setPeta(null)
    ambilLokasi().then(l => {
      if (mati) return; setLoc(l); setTimeout(() => { if (!mati) setTunggu(false) }, 6000)
      const p = buatPeta(l.lat, l.lng); setPeta(p)
      Promise.all([alamatDari(l.lat, l.lng).then(a => { if (!mati) setAlamat(a) }), p.siap]).then(() => { if (!mati) setGeo(true) })
    }).catch(e => { if (!mati) setErrLok(e.message) })
    return () => { mati = true }
  }, [ulang])
  useEffect(() => { const im = new Image(); im.onload = () => { logo.current = im }; im.src = import.meta.env.BASE_URL + 'logo.png' }, [])
  // 2. Kamera
  useEffect(() => {
    let stream, mati = false; frame.current = false; setKamera(false); setErrKam('')
    if (!navigator.mediaDevices?.getUserMedia) { setErrKam('Browser ini tidak mendukung kamera. Buka lewat Chrome.'); return }
    const ambilKamera = (c) => navigator.mediaDevices.getUserMedia(c)
    ambilKamera({ video: { facingMode: { ideal: facing } }, audio: false }).catch(e => e?.name === 'NotAllowedError' ? Promise.reject(e) : ambilKamera({ video: true, audio: false }))
      .then(s => { if (mati) return s.getTracks().forEach(t => t.stop()); stream = s; vref.current.srcObject = s; vref.current.play().catch(() => {}) })
      .catch(e => { if (!mati) setErrKam(pesanKamera(e)) })
    const t = setTimeout(() => { if (!mati && !frame.current) setErrKam('Kamera belum menampilkan gambar. Tekan Coba lagi atau ganti kamera dengan tombol 🔄.') }, 10000)
    return () => { mati = true; clearTimeout(t); stream?.getTracks().forEach(x => x.stop()) }
  }, [facing, ulang])
  dref.current = () => ({ jam: fmtJam(), tanggal: fmtTanggal(), hari: fmtHari(), alamat: alamat || (loc ? `${loc.lat.toFixed(5)}, ${loc.lng.toFixed(5)}` : 'Mencari lokasi…'), koperasi: koperasi?.nama || 'Koperasi', nama: profile.nama || '', kegiatan: AKSI[tipe].label + (catatan ? ` · ${catatan}` : ''), kode, peta, logo: logo.current })
  // 3. Gambar kamera + watermark ke kanvas; kamera dianggap siap saat gambar pertama benar-benar tampil
  useEffect(() => {
    if (hasil) return; let raf
    const loop = () => { const v = vref.current, c = cref.current
      if (v && c && v.videoWidth) {
        if (!frame.current) { frame.current = true; setKamera(true); setErrKam('') }
        const sc = Math.min(1, 1280 / v.videoWidth), W = Math.round(v.videoWidth * sc), H = Math.round(v.videoHeight * sc); if (c.width !== W) c.width = W; if (c.height !== H) c.height = H
        const g = c.getContext('2d'); g.drawImage(v, 0, 0, W, H); gambarWM(g, W, H, dref.current()) }
      raf = requestAnimationFrame(loop) }
    raf = requestAnimationFrame(loop); return () => cancelAnimationFrame(raf)
  }, [hasil])
  const galat = errKam || errLok, siap = kamera && !!loc && !galat && (geo || !tunggu)
  const ambil = () => cref.current.toBlob(b => { if (!b) return toast.error('Gagal mengambil foto', 'Coba lagi'); navigator.vibrate?.(30); setHasil({ blob: b, url: URL.createObjectURL(b) }) }, 'image/jpeg', 0.85)
  const simpan = async () => {
    setBusy(true)
    try {
      const path = `${profile.id}/${new Date().toISOString().slice(0, 10)}-${tipe}-${kode}.jpg`
      const { error: e1 } = await supabase.storage.from('absensi').upload(path, hasil.blob, { contentType: 'image/jpeg' }); if (e1) throw e1
      const { error: e2 } = await supabase.from('absensi').insert({ koperasi_id: profile.koperasi_id, user_id: profile.id, tipe, lat: loc.lat, lng: loc.lng, akurasi: loc.akurasi, alamat, foto_path: path, kode_foto: kode, catatan: catatan || null }); if (e2) throw e2
      toast.success(`${AKSI[tipe].label} berhasil ✅`, `${fmtJam()} · ${alamat || 'lokasi tersimpan'}`); onSelesai?.()
    } catch (e) { toast.error('Absen gagal', e.message) } finally { setBusy(false) }
  }
  return <div className="fixed inset-0 z-[80] bg-black text-white flex flex-col">
    <div className="flex items-center justify-between p-3"><button className="rounded-full bg-white/15 w-10 h-10 text-lg" onClick={onBatal}>✕</button><b>{AKSI[tipe].label}</b>
      <button className="rounded-full bg-white/15 w-10 h-10 text-lg disabled:opacity-40" disabled={!!hasil} onClick={() => setFacing(facing === 'user' ? 'environment' : 'user')}>🔄</button></div>
    <div className="flex flex-wrap gap-2 px-3 pb-2 text-[11px] font-bold"><span className={`rounded-full px-3 py-1 ${loc ? 'bg-emerald-500/30' : 'bg-white/15'}`}>{loc ? `📍 Lokasi ±${Math.round(loc.akurasi)} m` : errLok ? '📍 Lokasi gagal' : '📍 Mencari lokasi…'}</span>
      <span className={`rounded-full px-3 py-1 ${kamera ? 'bg-emerald-500/30' : 'bg-white/15'}`}>{kamera ? '📷 Kamera siap' : '📷 Membuka kamera…'}</span>
      {loc && <span className="rounded-full px-3 py-1 bg-white/15">{geo ? (alamat ? '🗺️ Alamat siap' : '🗺️ Tanpa alamat') : '🗺️ Memuat alamat & peta…'}</span>}</div>
    <div className="flex-1 min-h-0 grid place-items-center px-2"><video ref={vref} playsInline muted autoPlay className="absolute w-px h-px opacity-0 pointer-events-none" />
      {hasil ? <img src={hasil.url} className="max-h-full max-w-full rounded-2xl" /> : <canvas ref={cref} className="max-h-full max-w-full rounded-2xl bg-neutral-900" />}</div>
    {galat && <div className="m-3 rounded-2xl bg-rose-500/20 p-3 text-sm"><p>{galat}</p><button className="mt-2 rounded-xl bg-white/20 px-4 py-2 font-bold" onClick={() => setUlang(ulang + 1)}>Coba lagi</button></div>}
    {!galat && !hasil && loc && !geo && siap && <p className="text-center text-[11px] text-white/70 pb-1">Alamat/peta masih dimuat. Foto tetap bisa diambil.</p>}
    <div className="p-4 flex items-center justify-center gap-4" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
      {hasil ? <><button className="rounded-2xl bg-white/15 px-6 py-3 font-bold" disabled={busy} onClick={() => { setHasil(null); setKode(kodeFoto()) }}>Ulangi</button><button className="btn" disabled={busy} onClick={simpan}>{busy ? 'Menyimpan…' : 'Gunakan foto'}</button></>
        : <button disabled={!siap} onClick={ambil} className="w-20 h-20 rounded-full border-4 border-white bg-white/20 disabled:opacity-30 active:scale-90 transition" aria-label="Ambil foto"><span className="block w-14 h-14 rounded-full bg-white mx-auto" /></button>}
    </div></div>
}
