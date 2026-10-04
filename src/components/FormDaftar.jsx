import { useState } from 'react'
import { tempClient } from '../lib/tempClient'
import { supabase } from '../lib/supabase'
import { useToast } from '../lib/toast'
import { emailOrHp, digits, letters, compress } from '../lib/utils'
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const ALAMAT = [['rt', 'RT', 'digits', 3], ['rw', 'RW', 'digits', 3], ['kelurahan', 'Kelurahan', 'letters'], ['kecamatan', 'Kecamatan', 'letters'], ['kota', 'Kota/Kab', 'letters'], ['provinsi', 'Provinsi', 'letters'], ['pos', 'Kode Pos', 'digits', 5]]
function cek(f, files, role, needKode) {
  const e = {}, req = (k, m = 'Wajib diisi') => { if (!(f[k] || '').trim()) e[k] = m }, kon = (f.kontak || '').trim()
  if (needKode && !/^[A-Z0-9]{6,8}$/.test(f.kode || '')) e.kode = 'Kode 6-8 huruf/angka'
  if ((f.nama || '').trim().length < 3) e.nama = 'Nama minimal 3 huruf'
  if (!/^\d{16}$/.test(f.nik || '')) e.nik = 'NIK harus 16 digit angka'
  if (!(EMAIL.test(kon) || /^(0|62)\d{9,13}$/.test(kon))) e.kontak = 'Isi email valid atau No HP (08xxxxxxxxxx)'
  if ((f.password || '').length < 6) e.password = 'Minimal 6 karakter'
  if (role === 'admin') { req('nama_koperasi'); req('alamat_koperasi'); if (!/^\d{8,14}$/.test(f.telp_koperasi || '')) e.telp_koperasi = 'No telp 8-14 digit angka' }
  if (role !== 'nasabah' && (f.alamat || '').trim().length < 10) e.alamat = 'Alamat minimal 10 karakter'
  if (role === 'nasabah') {
    req('jalan'); req('usaha', 'Pilih salah satu')
    ALAMAT.forEach(([k]) => req(k)); if (f.pos && f.pos.length !== 5) e.pos = 'Kode pos 5 digit'
    if (!files.ktp) e.ktp = 'Foto KTP wajib'; if (!files.muka) e.muka = 'Foto wajib'; if (f.usaha === 'ya' && !files.usaha) e.usaha_f = 'Foto usaha wajib'
  }
  if (role === 'penagih') {
    req('exp', 'Pilih salah satu'); if (f.exp === 'ya') { req('dimana'); req('bidang'); req('lama') }
    ;[['ktp', 'KTP'], ['f46', 'Foto 4x6'], ['cv', 'CV'], ['ijazah', 'Ijazah']].forEach(([k, l]) => { if (!files[k]) e[k] = `${l} wajib` })
  }
  Object.entries(files).forEach(([k, fl]) => { if (fl && fl.size > 10e6) e[k] = 'Maksimal 10 MB' })
  return e
}
export default function FormDaftar({ role, kode: kodeFixed, approveNow, onDone }) {
  const toast = useToast(), [f, setF] = useState({}), [files, setFiles] = useState({}), [tried, setTried] = useState(false), [busy, setBusy] = useState(false), [step, setStep] = useState(['', 0])
  const e = cek(f, files, role, !kodeFixed && role !== 'admin')
  const set = (k, kind, max, v) => setF(p => ({ ...p, [k]: kind === 'digits' ? digits(v, max) : kind === 'letters' ? letters(v).slice(0, 60) : kind === 'kode' ? v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) : kind === 'contact' ? (/[a-zA-Z@]/.test(v) ? v.trim().slice(0, 80) : digits(v, 15)) : v }))
  const err = (k) => tried && e[k] && <p className="text-xs text-red-500 mt-1 ml-1">{e[k]}</p>
  const fld = (l, k, kind = 'text', max, ph, type = 'text') => <div key={k}><label className="lbl">{l}</label>
    <input type={type} inputMode={kind === 'digits' ? 'numeric' : undefined} placeholder={ph} className={`inp ${tried && e[k] ? '!border-red-400' : ''}`} value={f[k] || ''} onChange={ev => set(k, kind, max, ev.target.value)} />{err(k)}</div>
  const sel = (l, k, opts) => <div key={k}><label className="lbl">{l}</label><select className={`inp ${tried && e[k] ? '!border-red-400' : ''}`} value={f[k] || ''} onChange={ev => set(k, 'x', 0, ev.target.value)}><option value="">Pilih</option>{opts.map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select>{err(k)}</div>
  const file = (l, k, ek = k) => <div key={k}><label className="lbl">{l}</label><label className={`flex items-center gap-2 rounded-2xl border-2 border-dashed px-3 py-3 text-sm cursor-pointer ${tried && e[ek] ? 'border-red-400' : files[k] ? 'border-brand bg-brand-soft' : 'border-slate-200'}`}>
    <span>{files[k] ? '✓' : '📎'}</span><span className="truncate">{files[k]?.name || 'Ketuk untuk pilih file'}</span><input type="file" accept="image/*,.pdf" hidden onChange={ev => setFiles(p => ({ ...p, [k]: ev.target.files[0] }))} /></label>{err(ek)}</div>
  const H = (t) => <h2 className="font-extrabold text-sm text-brand-dark pt-2">{t}</h2>
  const submit = async () => {
    setTried(true); if (Object.keys(e).length) return toast.error('Periksa kembali isian', Object.values(e)[0])
    setBusy(true)
    try {
      const tc = tempClient(), kode = kodeFixed || f.kode, kon = f.kontak.trim(), hp = EMAIL.test(kon) ? '' : kon
      setStep(['Memeriksa data…', 10])
      const [a, b] = await Promise.all([role === 'admin' ? { data: true } : tc.rpc('cek_kode', { p_kode: kode }), tc.rpc('cek_blokir', { p_nik: f.nik, p_hp: hp })])
      if (!a.data) throw new Error('Kode koperasi tidak valid'); if (b.data) throw new Error('NIK atau No HP diblokir')
      setStep(['Membuat akun…', 30])
      const meta = { role, kode, nama: f.nama.trim(), nik: f.nik, no_hp: hp, alamat: f.alamat, nama_koperasi: f.nama_koperasi, alamat_koperasi: f.alamat_koperasi, telp_koperasi: f.telp_koperasi }
      const { data, error } = await tc.auth.signUp({ ...emailOrHp(kon), password: f.password, options: { data: meta } })
      if (error) throw error
      if (!data.session) throw new Error('Supabase meminta konfirmasi email. Matikan "Confirm email" di Authentication.')
      const uid = data.user.id
      const up = async (bucket, k) => { if (!files[k]) return null; const c = await compress(files[k]), p = `${uid}/${k}-${Date.now()}.${c.name.split('.').pop()}`; const { error } = await tc.storage.from(bucket).upload(p, c); if (error) throw error; return p }
      setStep(['Mengunggah foto…', 55])
      if (role === 'nasabah') {
        const [ktp, usaha, muka] = await Promise.all([up('ktp', 'ktp'), f.usaha === 'ya' ? up('foto_usaha', 'usaha') : null, up('ktp', 'muka')])
        const { error } = await tc.from('nasabah_detail').insert({ id: uid, punya_usaha: f.usaha === 'ya', foto_ktp: ktp, foto_usaha: usaha, foto_muka: muka,
          alamat_detail: { jalan: f.jalan, rt: f.rt, rw: f.rw, kelurahan: f.kelurahan, kecamatan: f.kecamatan, kota: f.kota, provinsi: f.provinsi, pos: f.pos } }); if (error) throw error
      }
      if (role === 'penagih') {
        const [ktp, f46, cv, ijazah] = await Promise.all(['ktp', 'f46', 'cv', 'ijazah'].map(k => up('dokumen_penagih', k)))
        const { error } = await tc.from('penagih_detail').insert({ id: uid, punya_pengalaman: f.exp === 'ya', pengalaman: f.exp === 'ya' ? { dimana: f.dimana, bidang: f.bidang, lama: f.lama } : null, foto_ktp: ktp, foto_4x6: f46, cv, ijazah }); if (error) throw error
      }
      setStep(['Menyelesaikan…', 90])
      if (approveNow) await supabase.from('profiles').update({ status: 'approved' }).eq('id', uid)
      tc.auth.signOut({ scope: 'local' })
      onDone?.()
    } catch (er) {
      const m = er?.message || ''
      toast.error('Pendaftaran gagal', /already registered/i.test(m) ? 'Email/No HP sudah terdaftar.' : /Database error/i.test(m) ? 'Data tidak dapat disimpan. NIK atau kontak kemungkinan sudah terdaftar.' : m || 'Coba lagi.')
    } finally { setBusy(false); setStep(['', 0]) }
  }
  return <div className="space-y-3">
    {role === 'admin' && <>{H('Data koperasi')}{fld('Nama Koperasi', 'nama_koperasi')}{fld('Alamat Koperasi', 'alamat_koperasi')}{fld('No Telp Koperasi', 'telp_koperasi', 'digits', 14, '021xxxxxxx')}</>}
    {role !== 'admin' && !kodeFixed && fld('Kode Koperasi', 'kode', 'kode', 8, 'contoh: KOP8A2X')}
    {H('Data diri')}{fld(role === 'admin' ? 'Nama Pemilik/Pendiri' : 'Nama Sesuai KTP', 'nama', 'letters')}{fld('NIK (16 digit)', 'nik', 'digits', 16, '16 digit angka')}
    {role === 'nasabah' ? <>{H('Alamat lengkap')}{fld('Nama Jalan', 'jalan')}<div className="grid grid-cols-2 gap-3">{ALAMAT.map(([k, l, kind, m]) => fld(l, k, kind, m))}</div></> : fld('Alamat Lengkap', 'alamat')}
    {H('Akun')}{fld('Email / No HP', 'kontak', 'contact', 80, 'email atau 08xxxxxxxxxx')}{fld('Password', 'password', 'x', 0, 'minimal 6 karakter', 'password')}
    {role === 'nasabah' && <>{H('Dokumen')}{sel('Punya usaha?', 'usaha', [['ya', 'Ya'], ['tidak', 'Tidak']])}{file('Foto KTP', 'ktp')}{f.usaha === 'ya' && file('Foto Usaha', 'usaha', 'usaha_f')}{f.usaha && file(f.usaha === 'ya' ? 'Foto Muka' : 'Foto Selfie dengan KTP', 'muka')}</>}
    {role === 'penagih' && <>{H('Pengalaman')}{sel('Punya pengalaman?', 'exp', [['ya', 'Ya'], ['tidak', 'Tidak']])}{f.exp === 'ya' && <>{fld('Dimana', 'dimana', 'letters')}{fld('Bidang apa', 'bidang', 'letters')}{fld('Berapa lama', 'lama', 'x', 0, 'contoh: 2 tahun')}</>}
      {H('Dokumen')}{file('Foto KTP', 'ktp')}{file('Foto 4x6', 'f46')}{file('CV', 'cv')}{file('Ijazah terakhir', 'ijazah')}</>}
    {busy && <div className="space-y-1"><div className="h-2 rounded-full bg-slate-100 overflow-hidden"><div className="h-full bg-gradient-to-r from-brand to-emerald-400 transition-all duration-500" style={{ width: step[1] + '%' }} /></div><p className="text-xs text-slate-500">{step[0]}</p></div>}
    <button className="btn w-full" disabled={busy} onClick={submit}>{busy ? 'Memproses…' : approveNow ? 'Simpan nasabah' : 'Kirim'}</button></div>
}
