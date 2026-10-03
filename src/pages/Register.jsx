import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase, upload } from '../lib/supabase'
import { emailOrHp } from '../lib/utils'
const F = ({ l, v, set, type = 'text', ph }) => <div><label className="lbl">{l}</label><input type={type} placeholder={ph} className="inp" value={v || ''} onChange={e => set(e.target.value)} /></div>
const Fl = ({ l, set }) => <div><label className="lbl">{l}</label><input type="file" accept="image/*,.pdf" className="text-sm" onChange={e => set(e.target.files[0])} /></div>
export default function Register() {
  const { tipe } = useParams(); const role = tipe
  const [f, setF] = useState({}), [files, setFiles] = useState({}), [msg, setMsg] = useState(''), [busy, setBusy] = useState(false), [done, setDone] = useState(false)
  const s = k => v => setF(p => ({ ...p, [k]: v })), sf = k => v => setFiles(p => ({ ...p, [k]: v }))
  const submit = async () => {
    setBusy(true); setMsg('')
    try {
      if (!/^\d{16}$/.test(f.nik || '')) throw new Error('NIK harus 16 digit')
      const hp = f.kontak?.includes('@') ? '' : f.kontak
      if (role !== 'admin') { const { data: kid } = await supabase.rpc('cek_kode', { p_kode: f.kode || '' }); if (!kid) throw new Error('Kode koperasi tidak valid atau belum disetujui') }
      const { data: blk } = await supabase.rpc('cek_blokir', { p_nik: f.nik, p_hp: hp || '' }); if (blk) throw new Error('NIK atau No HP diblokir')
      const meta = { role, kode: f.kode?.toUpperCase(), nama: f.nama, nik: f.nik, no_hp: hp, alamat: f.alamat, nama_koperasi: f.nama_koperasi, alamat_koperasi: f.alamat_koperasi, telp_koperasi: f.telp_koperasi }
      const { data, error } = await supabase.auth.signUp({ ...emailOrHp(f.kontak || ''), password: f.password, options: { data: meta } })
      if (error) throw error
      const uid = data.user.id
      if (role === 'nasabah') {
        const up = async (b, k) => files[k] ? upload(b, files[k], uid) : null
        await supabase.from('nasabah_detail').insert({ id: uid, punya_usaha: f.usaha === 'ya',
          alamat_detail: Object.fromEntries(['jalan', 'rt', 'rw', 'kelurahan', 'kecamatan', 'kota', 'provinsi', 'pos'].map(k => [k, f[k]])),
          foto_ktp: await up('ktp', 'ktp'), foto_usaha: await up('foto_usaha', 'usaha'), foto_muka: await up('ktp', 'muka') })
      }
      if (role === 'penagih') {
        const up = async (k) => files[k] ? upload('dokumen_penagih', files[k], uid) : null
        await supabase.from('penagih_detail').insert({ id: uid, punya_pengalaman: f.exp === 'ya', pengalaman: f.exp === 'ya' ? { dimana: f.dimana, bidang: f.bidang, lama: f.lama } : null,
          foto_ktp: await up('ktp'), foto_4x6: await up('f46'), cv: await up('cv'), ijazah: await up('ijazah') })
      }
      await supabase.auth.signOut(); setDone(true)
    } catch (e) { setMsg(e?.message || e?.error_description || JSON.stringify(e)) }
  }
  if (done) return <div className="min-h-screen grid place-items-center p-6"><div className="card max-w-sm text-center space-y-3"><h1 className="font-extrabold text-lg">Pendaftaran terkirim</h1>
    <p className="text-sm text-slate-500">{role === 'admin' ? 'Koperasi Anda menunggu persetujuan Super Admin. Kode unik tampil di menu Pengaturan setelah login.' : 'Menunggu persetujuan admin koperasi.'}</p><Link className="btn inline-block" to="/">Ke halaman masuk</Link></div></div>
  return <div className="min-h-screen p-4 flex justify-center"><div className="card w-full max-w-lg space-y-3">
    <h1 className="text-xl font-extrabold">Daftar {role === 'admin' ? 'Koperasi Baru' : role === 'nasabah' ? 'Nasabah' : 'Penagih'}</h1>
    {role !== 'admin' && <F l="Kode Koperasi" v={f.kode} set={s('kode')} ph="contoh: KOP8A2X" />}
    {role === 'admin' && <><F l="Nama Koperasi" v={f.nama_koperasi} set={s('nama_koperasi')} /><F l="Alamat Koperasi" v={f.alamat_koperasi} set={s('alamat_koperasi')} /><F l="No Telp Koperasi" v={f.telp_koperasi} set={s('telp_koperasi')} /></>}
    <F l={role === 'admin' ? 'Nama Pemilik/Pendiri' : 'Nama Sesuai KTP'} v={f.nama} set={s('nama')} />
    <F l="NIK" v={f.nik} set={s('nik')} />
    {role === 'nasabah' ? <div className="grid grid-cols-2 gap-2">
      <div className="col-span-2"><F l="Nama Jalan" v={f.jalan} set={s('jalan')} /></div>
      {[['rt', 'RT'], ['rw', 'RW'], ['kelurahan', 'Kelurahan'], ['kecamatan', 'Kecamatan'], ['kota', 'Kota/Kab'], ['provinsi', 'Provinsi'], ['pos', 'Kode Pos']].map(([k, l]) => <F key={k} l={l} v={f[k]} set={s(k)} />)}</div>
      : <F l="Alamat Lengkap" v={f.alamat} set={s('alamat')} />}
    <F l="Email / No HP" v={f.kontak} set={s('kontak')} />
    <F l="Password" type="password" v={f.password} set={s('password')} />
    {role === 'nasabah' && <>
      <div><label className="lbl">Punya usaha?</label><select className="inp" value={f.usaha || ''} onChange={e => s('usaha')(e.target.value)}><option value="">Pilih</option><option value="ya">Ya</option><option value="tidak">Tidak</option></select></div>
      <Fl l="Foto KTP" set={sf('ktp')} />
      {f.usaha === 'ya' ? <><Fl l="Foto Usaha" set={sf('usaha')} /><Fl l="Foto Muka" set={sf('muka')} /></> : f.usaha === 'tidak' && <Fl l="Foto Selfie dengan KTP" set={sf('muka')} />}</>}
    {role === 'penagih' && <>
      <div><label className="lbl">Punya pengalaman?</label><select className="inp" value={f.exp || ''} onChange={e => s('exp')(e.target.value)}><option value="">Pilih</option><option value="ya">Ya</option><option value="tidak">Tidak</option></select></div>
      {f.exp === 'ya' && <><F l="Dimana" v={f.dimana} set={s('dimana')} /><F l="Bidang apa" v={f.bidang} set={s('bidang')} /><F l="Berapa lama" v={f.lama} set={s('lama')} /></>}
      <Fl l="Foto KTP" set={sf('ktp')} /><Fl l="Foto 4x6" set={sf('f46')} /><Fl l="CV" set={sf('cv')} /><Fl l="Ijazah terakhir" set={sf('ijazah')} /></>}
    {msg && <p className="text-sm text-red-600">{msg}</p>}
    <button className="btn w-full" disabled={busy} onClick={submit}>{busy ? 'Mengirim…' : 'Daftar'}</button>
    <Link to="/" className="block text-center text-sm text-slate-500">Sudah punya akun? Masuk</Link></div></div>
}
