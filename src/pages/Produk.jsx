import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { rp } from '../lib/utils'
const logo = import.meta.env.BASE_URL + 'logo.png'
const uniq = a => [...new Set(a)].sort((x, y) => x - y)
export default function Produk() {
  const [rows, setRows] = useState(null)
  useEffect(() => { supabase.rpc('tarif_publik').then(({ data }) => setRows(data || [])) }, [])
  const kops = rows ? [...new Set(rows.map(r => r.koperasi))] : []
  const tabel = (kop, jenis) => {
    const R = rows.filter(r => r.koperasi === kop && r.jenis === jenis); if (!R.length) return null
    const tn = uniq(R.map(r => r.tenor)), pk = uniq(R.map(r => +r.pokok))
    return <div className="overflow-x-auto"><table className="w-full text-sm border-collapse"><thead><tr className="bg-brand-soft"><th className="p-2 text-left">Pinjaman</th>{tn.map(t => <th key={t} className="p-2">{t} {jenis}</th>)}</tr></thead>
      <tbody>{pk.map(p => <tr key={p} className="border-t"><td className="p-2 font-bold whitespace-nowrap">{rp(p)}</td>{tn.map(t => { const c = R.find(r => +r.pokok === p && r.tenor === t); return <td key={t} className="p-2 text-center whitespace-nowrap">{c ? rp(c.cicilan) : '-'}</td> })}</tr>)}</tbody></table></div>
  }
  return <div className="min-h-screen p-4 flex justify-center"><div className="w-full max-w-3xl space-y-4">
    <div className="flex items-center gap-3"><img src={logo} className="w-14 h-14 rounded-2xl" /><div><h1 className="text-xl font-extrabold">Koperasi Harian</h1><p className="text-xs text-slate-500">Layanan simpan pinjam dengan angsuran harian & bulanan</p></div></div>
    <div className="card space-y-1"><h2 className="font-bold">Tentang layanan</h2><p className="text-sm text-slate-600">Kami menyediakan pinjaman dengan angsuran harian (24-70 hari) dan bulanan (3-15 bulan). Seluruh harga dalam Rupiah (IDR). Pengajuan melalui pendaftaran akun dan diverifikasi koperasi sebelum pinjaman dicairkan.</p></div>
    <div className="card space-y-3"><h2 className="font-bold">Produk & harga (IDR)</h2>{rows === null && <p className="text-sm text-slate-500">Memuat…</p>}
      {rows && rows.length === 0 && <p className="text-sm text-slate-500">Tarif belum tersedia.</p>}
      {kops.map(k => <div key={k} className="space-y-3"><b className="text-sm">{k}</b>
        <div><div className="text-xs font-bold text-slate-500 mb-1">Cicilan per hari</div>{tabel(k, 'hari')}</div>
        <div><div className="text-xs font-bold text-slate-500 mb-1">Cicilan per bulan</div>{tabel(k, 'bulan')}</div></div>)}</div>
    <div className="card space-y-1"><h2 className="font-bold">Cara pembayaran</h2><ul className="text-sm text-slate-600 list-disc pl-5"><li>QRIS (dipindai lewat e-wallet atau mobile banking)</li><li>Transfer bank ke rekening koperasi</li><li>Tunai melalui penagih koperasi</li></ul></div>
    <div className="card space-y-1"><h2 className="font-bold">Syarat & ketentuan</h2><ul className="text-sm text-slate-600 list-disc pl-5"><li>Pendaftar wajib memiliki KTP dan data yang sesuai.</li><li>Keterlambatan dikenakan denda sesuai ketentuan koperasi.</li><li>Pembayaran yang sudah lunas tercatat otomatis di akun nasabah.</li></ul></div>
    {rows?.[0] && <div className="card space-y-1"><h2 className="font-bold">Kontak</h2><p className="text-sm text-slate-600">{rows[0].koperasi}<br />{rows[0].alamat}<br />Telp: {rows[0].telp}</p></div>}
    <div className="flex gap-2"><Link to="/" className="btn">Masuk</Link><Link to="/daftar/nasabah" className="btn2">Daftar nasabah</Link></div></div></div>
}
