import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { waLink, pesanTagih, rp } from '../lib/utils'
export default function PesanWA() {
  const [late, setLate] = useState([]), [all, setAll] = useState([]), [tpl, setTpl] = useState('Halo [Nama], ada promo pinjaman baru di koperasi kami. Hubungi kami untuk info lebih lanjut.')
  useEffect(() => { (async () => {
    const hari = new Date().toISOString().slice(0, 10)
    const { data } = await supabase.from('angsuran').select('*, nasabah:profiles(nama,no_hp)').eq('status', 'belum').lt('jatuh_tempo', hari); setLate(data || [])
    const { data: n } = await supabase.from('profiles').select('nama,no_hp').eq('role', 'nasabah').eq('status', 'approved').not('no_hp', 'is', null); setAll(n || []) })() }, [])
  return <div className="space-y-4"><h1 className="text-2xl font-extrabold">Pesan WhatsApp</h1>
    <div className="card"><h2 className="font-bold mb-2">Tagihan terlambat</h2>{late.map(a => <div key={a.id} className="flex justify-between items-center py-2 border-t text-sm">
      <span>{a.nasabah?.nama}<br /><span className="text-slate-500">{rp(+a.jumlah + +a.denda)}</span></span>
      <a className="btn" target="_blank" href={waLink(a.nasabah?.no_hp, pesanTagih(a.nasabah?.nama, +a.jumlah + +a.denda, a.jatuh_tempo))}>Tagih via WhatsApp</a></div>)}
      {late.length === 0 && <p className="text-sm text-slate-500">Tidak ada tagihan terlambat.</p>}</div>
    <div className="card space-y-2"><h2 className="font-bold">Broadcast marketing</h2><textarea className="inp" rows={3} value={tpl} onChange={e => setTpl(e.target.value)} />
      <p className="text-xs text-slate-500">Gunakan [Nama] sebagai variabel. WhatsApp membuka satu chat per tombol (batasan wa.me).</p>
      {all.map(n => <a key={n.no_hp} target="_blank" className="btn2 inline-block mr-2 mb-2" href={waLink(n.no_hp, tpl.replaceAll('[Nama]', n.nama))}>{n.nama}</a>)}</div></div>
}
