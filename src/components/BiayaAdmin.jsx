import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { useToast } from '../lib/toast'
import { rp, digits } from '../lib/utils'
const TENOR = { hari: [20, 24, 30, 45], minggu: [3, 4, 5] }, LABEL = { hari: 'Harian', minggu: 'Mingguan' }
export default function BiayaAdmin() {
  const { profile } = useAuth(), toast = useToast(), kid = profile.koperasi_id, [fee, setFee] = useState({}), [busy, setBusy] = useState(false)
  useEffect(() => { supabase.from('fee_tenor').select('jenis,tenor,fee_rp').eq('koperasi_id', kid).then(({ data }) => setFee(Object.fromEntries((data || []).map(x => [`${x.jenis}-${x.tenor}`, String(x.fee_rp)])))) }, [])
  const simpan = async () => {
    setBusy(true)
    const rows = Object.entries(TENOR).flatMap(([jenis, ts]) => ts.map(tenor => ({ koperasi_id: kid, jenis, tenor, fee_rp: +digits(fee[`${jenis}-${tenor}`] || '0', 9) })))
    const { error } = await supabase.from('fee_tenor').upsert(rows, { onConflict: 'koperasi_id,jenis,tenor' })
    error ? toast.error('Gagal', error.message) : toast.success('Fee tersimpan'); setBusy(false)
  }
  return <div className="card space-y-3"><div className="flex items-center justify-between"><h2 className="font-bold">Fee per tenor</h2><span className="text-[11px] bg-amber-100 text-amber-700 rounded-full px-2 py-1 font-bold">Hanya pemilik</span></div>
    <p className="text-xs text-slate-500">Tidak terlihat oleh penagih dan nasabah. Dicatat pada setiap pinjaman sesuai tenornya.</p>
    {Object.entries(TENOR).map(([jenis, ts]) => <div key={jenis}><label className="lbl">{LABEL[jenis]}</label><div className="grid grid-cols-2 gap-2">{ts.map(t => <div key={t}><div className="text-[11px] text-slate-500 ml-1">{t} {jenis} · {rp(fee[`${jenis}-${t}`] || 0)}</div>
      <input className="inp" inputMode="numeric" value={fee[`${jenis}-${t}`] ?? ''} onChange={e => setFee({ ...fee, [`${jenis}-${t}`]: digits(e.target.value, 9) })} /></div>)}</div></div>)}
    <button className="btn w-full" disabled={busy} onClick={simpan}>{busy ? 'Menyimpan…' : 'Simpan fee'}</button></div>
}
