import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { rp, tgl } from '../lib/utils'
export default function Pembayaran() {
  const { profile } = useAuth(); const r = profile.role, adm = r === 'admin' || r === 'super_admin'
  const metode = r === 'nasabah' ? ['TRANSFER', 'QRIS'] : r === 'penagih' ? ['CASH', 'TRANSFER'] : ['CASH', 'TRANSFER', 'QRIS']
  const [tag, setTag] = useState([]), [banks, setBanks] = useState([]), [ver, setVer] = useState([]), [sel, setSel] = useState(null), [m, setM] = useState(metode[0]), [bank, setBank] = useState(''), [qr, setQr] = useState(null), [err, setErr] = useState(''), [info, setInfo] = useState('')
  const load = async () => {
    const { data } = await supabase.from('angsuran').select('*, nasabah:profiles!angsuran_nasabah_id_fkey(nama)').eq('status', 'belum').order('jatuh_tempo'); setTag(data || [])
    const { data: b } = await supabase.from('bank_accounts').select('*'); setBanks(b || [])
    if (adm) { const { data: v } = await supabase.from('pembayaran').select('*, nasabah:profiles!pembayaran_nasabah_id_fkey(nama)').eq('status', 'menunggu_verifikasi'); setVer(v || []) }
  }
  useEffect(() => { load() }, [])
  const bankNama = (id) => { const x = banks.find(b => b.id === id); return x ? `${x.nama_bank} ${x.no_rekening}` : '-' }
  const bayar = async () => {
    setErr(''); setInfo('')
    if (m === 'QRIS') {
      const { data, error } = await supabase.functions.invoke('create-qris', { body: { angsuran_id: sel.id } })
      if (error || data?.error) {
        let msg = data?.error || error.message
        if (error?.context?.json) { const b = await error.context.json().catch(() => null); if (b?.error) msg = b.error }
        if (error?.name === 'FunctionsFetchError') msg = 'Function create-qris tidak terjangkau. Pastikan sudah di-deploy dengan nama persis create-qris memakai kode terbaru.'
        return setErr(msg)
      }
      return setQr(data)
    }
    if (m === 'TRANSFER' && !bank) return setErr('Pilih bank tujuan')
    const total = +sel.jumlah + +sel.denda
    if (r === 'penagih') { const { error } = await supabase.rpc('catat_bayar_penagih', { p_angsuran: sel.id, p_metode: m, p_bank: bank || null }); if (error) return setErr(error.message) }
    else if (r === 'nasabah') { const { error } = await supabase.from('pembayaran').insert({ angsuran_id: sel.id, koperasi_id: sel.koperasi_id, nasabah_id: sel.nasabah_id, metode: m, jumlah: total, bank_id: bank, status: 'menunggu_verifikasi' }); if (error) return setErr(error.message); setInfo('Pembayaran terkirim, menunggu verifikasi admin.') }
    else {
      const { error } = await supabase.from('pembayaran').insert({ angsuran_id: sel.id, koperasi_id: sel.koperasi_id, nasabah_id: sel.nasabah_id, metode: m, jumlah: total, bank_id: bank || null, status: 'sukses', dibuat_oleh: profile.id }); if (error) return setErr(error.message)
      await supabase.from('angsuran').update({ status: 'lunas', dibayar_at: new Date().toISOString() }).eq('id', sel.id)
      await supabase.from('tugas_tagih').update({ status: 'selesai' }).eq('angsuran_id', sel.id)
    }
    setSel(null); load()
  }
  const verif = async (id, ok) => { await supabase.rpc('verifikasi_pembayaran', { p_id: id, p_terima: ok }); load() }
  return <div className="space-y-4"><h1 className="judul">Pembayaran</h1>
    {info && <p className="card text-sm text-brand-dark">{info}</p>}
    {adm && ver.length > 0 && <div className="card space-y-2"><h2 className="font-bold">Verifikasi transfer ({ver.length})</h2>
      {ver.map(v => <div key={v.id} className="flex items-center justify-between gap-2 border-t pt-2 text-sm"><span>{v.nasabah?.nama}<br /><span className="text-slate-500">{rp(v.jumlah)} · {bankNama(v.bank_id)}</span></span>
        <span className="flex gap-2"><button className="btn" onClick={() => verif(v.id, true)}>Terima</button><button className="btn2" onClick={() => verif(v.id, false)}>Tolak</button></span></div>)}</div>}
    {tag.length === 0 && <p className="text-sm text-slate-500">Tidak ada tagihan yang perlu dibayar.</p>}
    {tag.map(a => <button key={a.id} onClick={() => { setSel(a); setQr(null); setErr(''); setM(metode[0]) }} className={`card w-full text-left ${sel?.id === a.id ? 'ring-2 ring-brand' : ''}`}>
      <div className="flex justify-between"><b>{a.nasabah?.nama}</b><b>{rp(+a.jumlah + +a.denda)}</b></div>
      <div className="text-xs text-slate-500">Angsuran #{a.ke} · jatuh tempo {tgl(a.jatuh_tempo)}{+a.denda > 0 && ` · denda ${rp(a.denda)}`}</div></button>)}
    {sel && <div className="card space-y-3"><h2 className="font-bold">Bayar {rp(+sel.jumlah + +sel.denda)}</h2>
      <div className="flex gap-2">{metode.map(x => <button key={x} onClick={() => { setM(x); setQr(null) }} className={m === x ? 'btn' : 'btn2'}>{x}</button>)}</div>
      {m === 'TRANSFER' && <div className="space-y-2">{banks.map(b => <label key={b.id} className="flex gap-2 items-center text-sm card"><input type="radio" name="bk" onChange={() => setBank(b.id)} /><span><b>{b.nama_bank}</b> {b.no_rekening}<br /><span className="text-slate-500">a.n. {b.nama_pemilik}</span></span></label>)}{banks.length === 0 && <p className="text-sm text-slate-500">Koperasi belum menambahkan rekening bank.</p>}</div>}
      {qr && <div className="text-center space-y-2">{qr.qr_url ? <img className="mx-auto w-56" src={qr.qr_url} /> : <QRCodeSVG className="mx-auto" value={qr.qr_string} size={224} />}<p className="text-sm text-slate-500">Scan dengan e-wallet/mobile banking. Tagihan lunas otomatis setelah dibayar; muat ulang halaman untuk melihat.</p></div>}
      {err && <p className="text-sm text-red-600">{err}</p>}
      {!qr && <button className="btn" onClick={bayar}>{m === 'QRIS' ? 'Buat QRIS' : 'Konfirmasi pembayaran'}</button>}</div>}</div>
}
