import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { rp, tgl } from '../lib/utils'
export default function Pembayaran() {
  const { profile } = useAuth(); const r = profile.role
  const metode = r === 'nasabah' ? ['TRANSFER', 'QRIS'] : r === 'penagih' ? ['CASH', 'TRANSFER'] : ['CASH', 'TRANSFER', 'QRIS']
  const [tag, setTag] = useState([]), [banks, setBanks] = useState([]), [sel, setSel] = useState(null), [m, setM] = useState(metode[0]), [bank, setBank] = useState(''), [qr, setQr] = useState(null), [err, setErr] = useState('')
  const load = async () => {
    const { data } = await supabase.from('angsuran').select('*, nasabah:profiles(nama)').eq('status', 'belum').order('jatuh_tempo'); setTag(data || [])
    const { data: b } = await supabase.from('bank_accounts').select('*'); setBanks(b || [])
  }
  useEffect(() => { load() }, [])
  const bayar = async () => {
    setErr('')
    if (m === 'QRIS') {
      const { data, error } = await supabase.functions.invoke('create-qris', { body: { angsuran_id: sel.id } })
      if (error || data?.error) return setErr(data?.error || error.message)
      return setQr(data)
    }
    if (m === 'TRANSFER' && !bank) return setErr('Pilih bank tujuan')
    const { error } = await supabase.from('pembayaran').insert({ angsuran_id: sel.id, koperasi_id: sel.koperasi_id, nasabah_id: sel.nasabah_id, metode: m, jumlah: +sel.jumlah + +sel.denda, bank_id: bank || null, dibuat_oleh: profile.id, status: r === 'nasabah' ? 'menunggu_verifikasi' : 'sukses' })
    if (error) return setErr(error.message)
    if (r !== 'nasabah') await supabase.from('angsuran').update({ status: 'lunas', dibayar_at: new Date().toISOString() }).eq('id', sel.id)
    setSel(null); load()
  }
  return <div className="space-y-4"><h1 className="text-2xl font-extrabold">Pembayaran</h1>
    {tag.length === 0 && <p className="text-sm text-slate-500">Tidak ada tagihan yang perlu dibayar.</p>}
    {tag.map(a => <button key={a.id} onClick={() => { setSel(a); setQr(null); setM(metode[0]) }} className={`card w-full text-left ${sel?.id === a.id ? 'ring-2 ring-brand' : ''}`}>
      <div className="flex justify-between"><b>{a.nasabah?.nama}</b><b>{rp(+a.jumlah + +a.denda)}</b></div>
      <div className="text-xs text-slate-500">Angsuran #{a.ke} · jatuh tempo {tgl(a.jatuh_tempo)}{+a.denda > 0 && ` · denda ${rp(a.denda)}`}</div></button>)}
    {sel && <div className="card space-y-3"><h2 className="font-bold">Bayar {rp(+sel.jumlah + +sel.denda)}</h2>
      <div className="flex gap-2">{metode.map(x => <button key={x} onClick={() => { setM(x); setQr(null) }} className={m === x ? 'btn' : 'btn2'}>{x}</button>)}</div>
      {m === 'TRANSFER' && <div className="space-y-2">{banks.map(b => <label key={b.id} className="flex gap-2 items-center text-sm card"><input type="radio" name="bk" onChange={() => setBank(b.id)} /><span><b>{b.nama_bank}</b> {b.no_rekening}<br /><span className="text-slate-500">a.n. {b.nama_pemilik}</span></span></label>)}{banks.length === 0 && <p className="text-sm text-slate-500">Koperasi belum menambahkan rekening bank.</p>}</div>}
      {qr && <div className="text-center space-y-2">{qr.qr_url ? <img className="mx-auto w-56" src={qr.qr_url} /> : <QRCodeSVG className="mx-auto" value={qr.qr_string} size={224} />}<p className="text-sm text-slate-500">Scan dengan aplikasi e-wallet/mobile banking. Status diperbarui otomatis setelah bayar.</p></div>}
      {err && <p className="text-sm text-red-600">{err}</p>}
      {!qr && <button className="btn" onClick={bayar}>{m === 'QRIS' ? 'Buat QRIS' : 'Konfirmasi pembayaran'}</button>}</div>}</div>
}
